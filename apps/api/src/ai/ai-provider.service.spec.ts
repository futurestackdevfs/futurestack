import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import { AiProviderService } from './ai-provider.service';

interface RecordedRequest {
  headers: IncomingMessage['headers'];
  body: any;
}

/** A tiny fake Anthropic API. `respond` decides status/body per call. */
async function mockAnthropic(
  respond: (call: number, req: RecordedRequest) => { status: number; body: unknown },
): Promise<{ baseURL: string; requests: RecordedRequest[]; close: () => Promise<void> }> {
  const requests: RecordedRequest[] = [];
  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const rec = { headers: req.headers, body: raw ? JSON.parse(raw) : {} };
      requests.push(rec);
      const { status, body } = respond(requests.length, rec);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
  const { port } = server.address() as AddressInfo;
  return { baseURL: `http://127.0.0.1:${port}`, requests, close: () => new Promise((r) => server.close(() => r(undefined))) };
}

const message = (text: string, stop_reason = 'end_turn') => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-opus-5',
  content: [{ type: 'text', text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 120, output_tokens: 1800 },
});

const apiError = (type: string, msg: string) => ({ type: 'error', error: { type, message: msg } });

const Wire = z.object({ ok: z.boolean() });

function makeService(env: Record<string, string>, baseURL: string) {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const svc = new AiProviderService(config);
  // Point the internal client at the fake server (test-only reach-in, avoids a bespoke constructor param).
  (svc as unknown as { client: { baseURL: string } }).client!.baseURL = baseURL;
  return svc;
}

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((c) => c()));
});

const ENV = { ANTHROPIC_API_KEY: 'sk-ant-test-key-000000000000', ANTHROPIC_MODEL: 'claude-opus-5' };

describe('AiProviderService', () => {
  it('reports not configured when no API key is set (no network call)', async () => {
    const svc = new AiProviderService({ get: () => undefined } as unknown as ConfigService);
    expect(svc.isConfigured).toBe(false);
    await expect(
      svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 }),
    ).rejects.toMatchObject({ code: 'not_configured' });
  });

  it('sends adaptive thinking + structured output config and returns parsed, validated data', async () => {
    const mock = await mockAnthropic(() => ({ status: 200, body: message(JSON.stringify({ ok: true })) }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);

    const out = await svc.structured({ system: 'sys', user: 'usr', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 500 });

    expect(out).toEqual({ data: { ok: true }, model: 'claude-opus-5', inputTokens: 120, outputTokens: 1800, cacheReadTokens: 0, cacheWriteTokens: 0 });
    const req = mock.requests[0]!.body;
    expect(req.thinking).toEqual({ type: 'adaptive' });
    expect(req.output_config.effort).toBe('low');
    expect(req.output_config.format.type).toBe('json_schema');
    expect(req.temperature).toBeUndefined();
    expect(req.fallbacks).toBe('default');
    expect(String(mock.requests[0]!.headers['anthropic-beta'])).toContain('server-side-fallback-2026-07-01');
  });

  it('omits the fallback beta when ANTHROPIC_FALLBACKS=off', async () => {
    const mock = await mockAnthropic(() => ({ status: 200, body: message(JSON.stringify({ ok: true })) }));
    closers.push(mock.close);
    const svc = makeService({ ...ENV, ANTHROPIC_FALLBACKS: 'off' }, mock.baseURL);

    await svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });

    expect(mock.requests[0]!.body.fallbacks).toBeUndefined();
  });

  it('maps a refusal to a non-retryable error', async () => {
    const mock = await mockAnthropic(() => ({ status: 200, body: message('', 'refusal') }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    await expect(
      svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 }),
    ).rejects.toMatchObject({ code: 'refused', retryable: false });
  });

  it('maps max_tokens truncation to a retryable error', async () => {
    const mock = await mockAnthropic(() => ({ status: 200, body: message('{', 'max_tokens') }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    await expect(
      svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 }),
    ).rejects.toMatchObject({ code: 'truncated', retryable: true });
  });

  it('retries once on invalid JSON / failed validation, then gives up', async () => {
    const mock = await mockAnthropic(() => ({ status: 200, body: message('not json') }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    await expect(
      svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 }),
    ).rejects.toMatchObject({ code: 'invalid_output', retryable: true });
    expect(mock.requests).toHaveLength(2);
  });

  it('recovers when the retry succeeds', async () => {
    const mock = await mockAnthropic((n) => (n === 1 ? { status: 200, body: message('not json') } : { status: 200, body: message(JSON.stringify({ ok: true })) }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    const out = await svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });
    expect(out.data).toEqual({ ok: true });
  });

  it('degrades once to no-fallbacks when the provider rejects the beta', async () => {
    let rejected = false;
    const mock = await mockAnthropic(() => {
      if (!rejected) {
        rejected = true;
        return { status: 400, body: apiError('invalid_request_error', 'Unknown beta: server-side-fallback-2026-07-01') };
      }
      return { status: 200, body: message(JSON.stringify({ ok: true })) };
    });
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    const out = await svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });
    expect(out.data).toEqual({ ok: true });
    expect(mock.requests[1]!.body.fallbacks).toBeUndefined();
  });

  it('degrades once to no-thinking/effort when the model rejects them (e.g. Haiku)', async () => {
    let rejected = false;
    const mock = await mockAnthropic(() => {
      if (!rejected) {
        rejected = true;
        return { status: 400, body: apiError('invalid_request_error', 'thinking is not supported for this model') };
      }
      return { status: 200, body: message(JSON.stringify({ ok: true })) };
    });
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    const out = await svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });
    expect(out.data).toEqual({ ok: true });
    expect(mock.requests[0]!.body.thinking).toEqual({ type: 'adaptive' });
    expect(mock.requests[1]!.body.thinking).toBeUndefined();
    expect(mock.requests[1]!.body.output_config.effort).toBeUndefined();
    expect(mock.requests[1]!.body.output_config.format.type).toBe('json_schema');
  });

  it('keeps the degraded (no-thinking) mode for later calls on the same service instance', async () => {
    let calls = 0;
    const mock = await mockAnthropic(() => {
      calls++;
      if (calls === 1) return { status: 400, body: apiError('invalid_request_error', 'effort is not supported for this model') };
      return { status: 200, body: message(JSON.stringify({ ok: true })) };
    });
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);

    await svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });
    await svc.structured({ system: 's', user: 'u2', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });

    // 2 requests for the first call (reject + retry) + 1 for the second (goes straight to no-thinking) = 3
    expect(mock.requests).toHaveLength(3);
    expect(mock.requests[2]!.body.thinking).toBeUndefined();
  });

  it('always uses the documented-safe 5-minute cache TTL, never 1h', async () => {
    const mock = await mockAnthropic(() => ({ status: 200, body: message(JSON.stringify({ ok: true })) }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    await svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 });
    const cacheControl = mock.requests[0]!.body.system[0].cache_control;
    expect(cacheControl.type).toBe('ephemeral');
    expect(cacheControl.ttl).toBeUndefined();
  });

  it('maps provider auth failures without leaking the key', async () => {
    const mock = await mockAnthropic(() => ({ status: 401, body: apiError('authentication_error', 'invalid x-api-key sk-ant-secret') }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    const err = await svc
      .structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 })
      .catch((e) => e);
    expect(err.code).toBe('upstream_auth');
    expect(err.message).not.toContain('sk-ant');
  });

  it('maps provider rate limiting to a retryable error', async () => {
    const mock = await mockAnthropic(() => ({ status: 429, body: apiError('rate_limit_error', 'slow down') }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    await expect(
      svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 }),
    ).rejects.toMatchObject({ code: 'upstream_rate_limited', retryable: true });
  });

  it('maps provider outages to an error', async () => {
    const mock = await mockAnthropic(() => ({ status: 500, body: apiError('api_error', 'boom') }));
    closers.push(mock.close);
    const svc = makeService(ENV, mock.baseURL);
    await expect(
      svc.structured({ system: 's', user: 'u', wire: Wire, validate: (j) => Wire.safeParse(j), effort: 'low', maxTokens: 100 }),
    ).rejects.toMatchObject({ code: 'upstream_unavailable', retryable: true });
  });
});
