import { AiProviderError } from '../../ai/ai.errors';
import { AiProviderService, StructuredCallOptions, StructuredCallResult } from '../../ai/ai-provider.service';
import { ArticleGenerator } from './article-generator';
import { ArticleSchema } from './schemas';

const VALID_ARTICLE = {
  title: 'Understanding Backpressure In Node Streams',
  content: '## Introduction\n' + 'Streams move data in chunks and backpressure keeps producers honest. '.repeat(60),
  metaDescription: 'A practical guide to backpressure in Node.js streams: what it is, why it matters, and how to handle it correctly.',
  tags: ['nodejs', 'streams', 'backend'],
};

const RESEARCH = {
  angle: 'Backpressure keeps fast producers from overwhelming slow consumers in Node streams.',
  audience: 'Node.js developers',
  facts: [
    'Node streams move data in chunks rather than loading everything into memory.',
    "writable.write() returns false when the internal buffer is above the highWaterMark.",
    'The default highWaterMark for byte streams is 16384 bytes.',
    'pipeline() wires streams together and propagates errors and backpressure.',
  ],
  outline: ['What is backpressure', 'Reading the signals', 'Using pipeline', 'Common mistakes'],
  seoKeywords: ['node streams', 'backpressure', 'highWaterMark'],
};

/** A fake AiProviderService that plays back queued results in call order. */
function fakeAi(results: (() => StructuredCallResult<unknown>) [] | ((n: number, opts: StructuredCallOptions<any, any>) => StructuredCallResult<unknown>)) {
  const calls: StructuredCallOptions<any, any>[] = [];
  let n = 0;
  const structured = jest.fn(async (opts: StructuredCallOptions<any, any>) => {
    n++;
    calls.push(opts);
    if (typeof results === 'function') return results(n, opts);
    const r = results[n - 1];
    if (!r) throw new Error(`no fake result queued for call ${n}`);
    return r();
  });
  const ai = { isConfigured: true, modelName: 'claude-opus-5', structured } as unknown as AiProviderService;
  return { ai, calls, callCount: () => n };
}

const res = (data: unknown, model = 'claude-opus-5', inputTokens = 100, outputTokens = 500): StructuredCallResult<any> => ({
  data,
  model,
  inputTokens,
  outputTokens,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
});

describe('ArticleGenerator', () => {
  it('runs research then write, reporting each stage once, with no repair call when the guard is clean', async () => {
    const { ai, calls, callCount } = fakeAi([() => res(RESEARCH), () => res(VALID_ARTICLE)]);
    const gen = new ArticleGenerator(ai);

    const stages: string[] = [];
    const out = await gen.generate('Node streams', (s) => stages.push(s));

    expect(stages).toEqual(['research', 'write', 'verify']);
    expect(callCount()).toBe(2);
    expect(out.article.title).toBe(VALID_ARTICLE.title);
    expect(out.meta).toMatchObject({ calls: 2, repaired: false, inputTokens: 200, outputTokens: 1000 });

    expect(calls[0].maxTokens).toBe(1200);
    expect(calls[0].user).toContain('<topic>Node streams</topic>');
    expect(calls[1].user).toContain('highWaterMark for byte streams is 16384');
    expect(calls[1].system).toMatch(/Use ONLY the facts/);
  });

  it('makes a cheap repair call only when the article contains figures the research does not support', async () => {
    const invented = { ...VALID_ARTICLE, content: VALID_ARTICLE.content + '\nBenchmarks show a 47% speedup and 3182 ops/sec.' };
    const { ai, calls, callCount } = fakeAi([() => res(RESEARCH), () => res(invented), () => res(VALID_ARTICLE)]);
    const gen = new ArticleGenerator(ai);

    const out = await gen.generate('Node streams');

    expect(callCount()).toBe(3);
    expect(out.meta).toMatchObject({ calls: 3, repaired: true });
    expect(out.article.content).not.toContain('47%');
    expect(calls[2].user).toContain('47%');
    expect(calls[2].user).toContain('3182');
  });

  it('accepts a still-flagged repair result instead of looping', async () => {
    const invented = { ...VALID_ARTICLE, content: VALID_ARTICLE.content + '\nBenchmarks show a 47% speedup.' };
    const { ai, callCount } = fakeAi([() => res(RESEARCH), () => res(invented), () => res(invented)]);
    const gen = new ArticleGenerator(ai);

    const out = await gen.generate('Node streams');

    expect(out.meta).toMatchObject({ calls: 3, repaired: true });
    expect(callCount()).toBe(3);
  });

  it('does not repair when figures come from the research notes, small counts, or years', async () => {
    const grounded = {
      ...VALID_ARTICLE,
      content: VALID_ARTICLE.content + '\nThe default highWaterMark is 16384 bytes. There are 3 steps, updated in 2025.',
    };
    const { ai, callCount } = fakeAi([() => res(RESEARCH), () => res(grounded)]);
    const gen = new ArticleGenerator(ai);

    const out = await gen.generate('Node streams');

    expect(out.meta).toMatchObject({ calls: 2, repaired: false });
    expect(callCount()).toBe(2);
  });

  it('propagates an AiProviderError from any stage unchanged', async () => {
    const failing = { isConfigured: true, modelName: 'x', structured: jest.fn().mockRejectedValue(new AiProviderError('refused', 'no', false)) };
    const gen = new ArticleGenerator(failing as unknown as AiProviderService);
    await expect(gen.generate('x')).rejects.toMatchObject({ code: 'refused' });
  });

  it('exposes isConfigured from the underlying AI provider', () => {
    const notConfigured = { isConfigured: false, modelName: 'x', structured: jest.fn() } as unknown as AiProviderService;
    expect(new ArticleGenerator(notConfigured).isConfigured).toBe(false);
  });

  it('the schema still rejects a too-short article (sanity check on ArticleSchema)', () => {
    expect(ArticleSchema.safeParse({ ...VALID_ARTICLE, content: 'too short' }).success).toBe(false);
  });
});
