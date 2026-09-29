import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { AiProviderError } from './ai.errors';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface StructuredCallOptions<S extends z.ZodType, V> {
  system: string;
  user: string;
  /** Schema Claude is constrained to reply with (structured outputs — always-parseable JSON). */
  wire: S;
  /** Re-validates/narrows the parsed JSON; return success:false to trigger one automatic retry. */
  validate: (json: unknown) => { success: true; data: V } | { success: false; error: z.ZodError };
  effort: Effort;
  maxTokens: number;
  /** Aborts the in-flight HTTP request (and skips any retry) when the caller cancels the job. */
  signal?: AbortSignal;
}

/** Token/cache accounting for one or more calls to the model — shared shape any feature can log/display. */
export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from Anthropic's prompt cache (billed at ~10% of input price) — 0 if the cache wasn't hit/eligible. */
  cacheReadTokens: number;
  /** Tokens written to the cache on this call (billed at ~125% of input price, paid back by later hits). */
  cacheWriteTokens: number;
}

export interface StructuredCallResult<V> extends AiUsage {
  data: V;
}

const MAX_ATTEMPTS = 2;

/**
 * Thin, feature-agnostic wrapper around the Anthropic SDK. Any part of the API
 * that wants an AI call — blog generation today, something else tomorrow —
 * injects this service instead of talking to `@anthropic-ai/sdk` directly, so
 * the API key, model choice, retry policy and error mapping live in one place.
 *
 * Not configured (`ANTHROPIC_API_KEY` unset) is a first-class, cheap-to-check
 * state (`isConfigured`) rather than a thrown error on first use, so callers
 * can fail fast with a clear message instead of a stack trace.
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly useFallbacksDefault: boolean;
  /** Cached process-wide once a model rejects `thinking`/`output_config.effort` (Opus-4.5+-era fields; not every model supports them, e.g. Haiku). */
  private thinkingSupported = true;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.client = apiKey ? new Anthropic({ apiKey, timeout: this.num('ANTHROPIC_TIMEOUT_MS', 110_000) }) : null;
    // Cheapest available model by default ($1/$5 per MTok in/out vs $5/$25 for Opus 5) —
    // override with ANTHROPIC_MODEL if a feature needs more reasoning quality.
    this.model = this.config.get<string>('ANTHROPIC_MODEL')?.trim() || 'claude-haiku-4-5-20251001';
    this.useFallbacksDefault = (this.config.get<string>('ANTHROPIC_FALLBACKS')?.trim() || 'default') !== 'off';
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI features are disabled until it is configured.');
    }
  }

  private num(key: string, def: number): number {
    const raw = this.config.get<string>(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : def;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  get modelName(): string {
    return this.model;
  }

  /**
   * One structured-output call, validated and retried once on a bad result.
   * Degrades automatically (once, cached for the process) if the account/org
   * rejects the server-side refusal-fallback beta.
   */
  async structured<S extends z.ZodType, V>(opts: StructuredCallOptions<S, V>): Promise<StructuredCallResult<V>> {
    if (!this.client) {
      throw new AiProviderError('not_configured', 'AI generation is not configured. Set ANTHROPIC_API_KEY and restart.', false);
    }
    const client = this.client;
    let useFallbacks = this.useFallbacksDefault;
    let useThinking = this.thinkingSupported;
    let lastInvalid = '';
    let model = this.model;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (opts.signal?.aborted) {
        throw new AiProviderError('cancelled', 'Generation was cancelled.', false);
      }
      let response;
      try {
        response = await client.beta.messages.create(
          {
            model: this.model,
            max_tokens: opts.maxTokens,
            ...(useThinking ? { thinking: { type: 'adaptive' }, output_config: { effort: opts.effort, format: zodOutputFormat(opts.wire as never) } } : { output_config: { format: zodOutputFormat(opts.wire as never) } }),
            // Prompt caching: the research/write/repair system prompts are fixed strings
            // reused across every generation job. Kept at the documented-safe 5-minute
            // default (no extra beta header needed) — below the model's minimum
            // cacheable length this is a documented no-op, not an extra charge.
            system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: opts.user }],
            // Server-side refusal fallback routing (SDK typings lag this beta form).
            ...(useFallbacks ? ({ betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as Record<string, unknown>) : {}),
          } as Anthropic.Beta.Messages.MessageCreateParams,
          { signal: opts.signal },
        );
      } catch (err) {
        if (useFallbacks && err instanceof Anthropic.BadRequestError && /fallback|beta/i.test(err.message)) {
          this.logger.warn('Provider rejected refusal-fallbacks beta; retrying without it (set ANTHROPIC_FALLBACKS=off to silence)');
          useFallbacks = false;
          attempt--;
          continue;
        }
        if (useThinking && err instanceof Anthropic.BadRequestError && /thinking|effort|output_config/i.test(err.message)) {
          this.logger.warn(`Model "${this.model}" rejected adaptive thinking/effort; retrying without them (${err.message})`);
          useThinking = false;
          this.thinkingSupported = false;
          attempt--;
          continue;
        }
        throw this.mapProviderError(err, opts.signal);
      }

      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
      cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
      cacheWriteTokens += response.usage.cache_creation_input_tokens ?? 0;
      model = response.model;

      if (response.stop_reason === 'refusal') {
        throw new AiProviderError('refused', 'The AI declined this request. Try different input.', false);
      }
      if (response.stop_reason === 'max_tokens') {
        throw new AiProviderError('truncated', 'The AI response was cut off. Try a narrower request.', true);
      }

      const block = response.content.find((b) => b.type === 'text');
      const raw = block && block.type === 'text' ? block.text : '';

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        lastInvalid = 'not valid JSON';
        this.logger.warn(`Model output failed validation (attempt ${attempt}): ${lastInvalid}`);
        continue;
      }
      const result = opts.validate(json);
      if (result.success) {
        return { data: result.data, model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens };
      }
      const first = result.error.issues[0];
      lastInvalid = `${first?.path.join('.') || 'output'}: ${first?.message ?? 'invalid'}`;
      this.logger.warn(`Model output failed validation (attempt ${attempt}): ${lastInvalid}`);
    }

    throw new AiProviderError('invalid_output', `The AI returned an unusable result (${lastInvalid}). Try again.`, true);
  }

  private mapProviderError(err: unknown, signal?: AbortSignal): AiProviderError {
    if (err instanceof AiProviderError) return err;
    if (signal?.aborted || (err as { name?: string })?.name === 'AbortError') {
      return new AiProviderError('cancelled', 'Generation was cancelled.', false);
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      this.logger.error(`Anthropic rejected the API key (status ${(err as { status?: number }).status})`);
      return new AiProviderError('upstream_auth', 'The AI provider rejected the configured API key.', false);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return new AiProviderError('upstream_rate_limited', 'The AI provider is rate limiting requests. Try again shortly.', true);
    }
    if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.InternalServerError) {
      return new AiProviderError('upstream_unavailable', 'The AI provider is unreachable or having an outage. Try again later.', true);
    }
    if (err instanceof Anthropic.APIError) {
      // err.message may echo request content (e.g. the system prompt) back in validation
      // errors — server-side log only, never returned to the client.
      this.logger.error(`Unexpected Anthropic API error (status ${err.status}): ${err.message}`);
      return new AiProviderError('upstream_unavailable', `The AI provider returned an error (HTTP ${err.status}).`, false);
    }
    this.logger.error(`Unexpected error calling Anthropic: ${(err as Error)?.message}`);
    return new AiProviderError('internal', 'Unexpected error while calling the AI provider.', false);
  }
}
