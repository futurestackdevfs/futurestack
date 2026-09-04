import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Thrown for every AI failure with a message safe to show an admin. */
export class AiError extends ServiceUnavailableException {
  constructor(
    message: string,
    readonly reason:
      | 'not_configured'
      | 'no_credits'
      | 'invalid_key'
      | 'rate_limited'
      | 'bad_model'
      | 'bad_request'
      | 'upstream_down'
      | 'network'
      | 'empty_response'
      | 'invalid_json'
      | 'unknown',
    readonly retryable = false,
  ) {
    super({ statusCode: 503, error: 'AI Generation Failed', message, reason, retryable });
  }
}

export interface CompleteOptions {
  /** System / instruction prompt. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** Upper bound on output tokens. Default 4096. */
  maxTokens?: number;
  /** Ask the model for strict JSON and parse it before returning. */
  json?: boolean;
  temperature?: number;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * OpenAI Chat Completions wrapper.
 *
 *   OPENAI_API_KEY    required to use AI features
 *   OPENAI_MODEL      model id            (default: gpt-4o-mini)
 *   OPENAI_BASE_URL   override base URL   (default: https://api.openai.com/v1)
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  /** Reads an env var, treating "" / whitespace the same as unset. */
  private env(key: string): string | undefined {
    const v = this.config.get<string>(key)?.trim();
    return v ? v : undefined;
  }

  get model(): string {
    return this.env('OPENAI_MODEL') ?? DEFAULT_MODEL;
  }

  get isConfigured(): boolean {
    return !!this.env('OPENAI_API_KEY');
  }

  private get apiKey(): string {
    const key = this.env('OPENAI_API_KEY');
    if (!key) {
      throw new AiError(
        'AI is not configured. Add OPENAI_API_KEY to the backend .env and restart the server.',
        'not_configured',
      );
    }
    return key;
  }

  private get baseUrl(): string {
    return (this.env('OPENAI_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async complete(opts: CompleteOptions): Promise<string> {
    const maxTokens = opts.maxTokens ?? 4096;
    const system = opts.json
      ? `${opts.system ?? ''}\n\nRespond with ONLY a single valid JSON object. No markdown, no code fences, no prose.`.trim()
      : opts.system;

    const key = this.apiKey; // throws AiError('not_configured') if missing

    let res: Response;
    let body: string;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: opts.prompt },
          ],
        }),
        signal: AbortSignal.timeout(90_000),
      });
      body = await res.text();
    } catch (err) {
      const msg = (err as Error)?.name === 'TimeoutError'
        ? 'The AI request timed out after 90s. Try again.'
        : `Could not reach the AI provider (${this.baseUrl}). Check the network / OPENAI_BASE_URL.`;
      this.logger.error(`AI network error: ${(err as Error)?.message}`);
      throw new AiError(msg, 'network', true);
    }

    if (!res.ok) {
      this.logger.error(`OpenAI HTTP ${res.status}: ${body.slice(0, 600)}`);
      throw this.describeHttpError(res.status, body);
    }

    let data: any;
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      throw new AiError('The AI provider returned an unreadable response.', 'unknown');
    }

    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) {
      const finish = data?.choices?.[0]?.finish_reason;
      throw new AiError(
        finish === 'length'
          ? 'The AI response was cut off (token limit). Try a shorter topic.'
          : 'The AI returned an empty response. Try again.',
        'empty_response',
        true,
      );
    }
    return text.trim();
  }

  /** Turn an OpenAI-style error body into an admin-readable AiError. */
  private describeHttpError(status: number, body: string): AiError {
    let apiMsg = '';
    let apiCode = '';
    try {
      const e = JSON.parse(body)?.error;
      apiMsg = e?.message ?? '';
      apiCode = e?.code ?? e?.type ?? '';
    } catch {
      /* non-JSON body */
    }

    if (
      status === 429 &&
      /quota|credit|billing/i.test(`${apiCode} ${apiMsg}`)
    ) {
      return new AiError(
        'The OpenAI account has no credits left. Add billing at platform.openai.com, or point OPENAI_BASE_URL / OPENAI_MODEL at another provider (e.g. Groq, OpenRouter).',
        'no_credits',
      );
    }
    if (status === 429) {
      return new AiError('OpenAI rate limit hit. Wait a minute and try again.', 'rate_limited', true);
    }
    if (status === 401 || status === 403) {
      return new AiError(
        'OpenAI rejected the API key. Check OPENAI_API_KEY in the backend .env (and restart).',
        'invalid_key',
      );
    }
    if (status === 404 || /model/i.test(apiMsg)) {
      return new AiError(
        `Model "${this.model}" is not available for this key. Set a valid OPENAI_MODEL.`,
        'bad_model',
      );
    }
    if (status === 400) {
      return new AiError(`The AI provider rejected the request: ${apiMsg || 'bad request'}.`, 'bad_request');
    }
    if (status >= 500) {
      return new AiError(`The AI provider is having an outage (HTTP ${status}). Try again later.`, 'upstream_down', true);
    }
    return new AiError(`AI request failed (HTTP ${status})${apiMsg ? `: ${apiMsg}` : ''}.`, 'unknown', true);
  }

  /** `complete` + JSON.parse (tolerates stray code fences / leading prose). */
  async completeJson<T = unknown>(opts: Omit<CompleteOptions, 'json'>): Promise<T> {
    const raw = await this.complete({ ...opts, json: true });
    const cleaned = raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    try {
      return JSON.parse(slice) as T;
    } catch {
      this.logger.error(`AI returned non-JSON: ${raw.slice(0, 500)}`);
      throw new AiError(
        'The AI response was not valid JSON. Try again, or use a stronger model.',
        'invalid_json',
        true,
      );
    }
  }
}
