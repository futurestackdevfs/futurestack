import { AiProviderError } from '../../ai/ai.errors';
import { AiProviderService, StructuredCallOptions, StructuredCallResult } from '../../ai/ai-provider.service';
import { CourseInput, RoadmapGenerator } from './roadmap-generator';

const COURSE: CourseInput = {
  title: 'Full-Stack Web Development',
  description: 'Learn to build production apps.',
  category: 'Web Development',
  skillLevel: 'BEGINNER',
  techStack: ['React', 'Node.js'],
  sections: [
    { title: 'Frontend Basics', lessonTitles: ['Intro to HTML', 'CSS Fundamentals'] },
    { title: 'Backend Basics', lessonTitles: ['Node.js Fundamentals', 'Building REST APIs'] },
  ],
};

const VALID_ROADMAP = {
  title: 'Full-Stack Developer Roadmap',
  summary: 'From zero to a job-ready full-stack developer.',
  prerequisites: ['Basic computer literacy'],
  phases: [
    {
      phase: 'Beginner',
      nodes: [
        {
          title: 'HTML & CSS',
          description: 'Build the structure',
          chips: [{ title: 'CSS Layout', kind: 'must', lessonTitles: ['Intro to HTML', 'CSS Fundamentals'] }],
        },
      ],
    },
    {
      phase: 'Intermediate',
      nodes: [
        {
          title: 'Node.js',
          description: 'Run JS on the server',
          chips: [{ title: 'Modules & npm', kind: 'must', lessonTitles: ['Node.js Fundamentals', 'Building REST APIs', 'invented lesson'] }],
        },
      ],
    },
    {
      phase: 'Advanced',
      nodes: [
        {
          title: 'Deployment',
          description: 'Ship to production',
          chips: [{ title: 'CI/CD', kind: 'pick-one', lessonTitles: [] }],
        },
      ],
    },
  ],
};

function fakeAi(impl: (opts: StructuredCallOptions<any, any>) => StructuredCallResult<unknown> | Promise<StructuredCallResult<unknown>>) {
  const calls: StructuredCallOptions<any, any>[] = [];
  const structured = jest.fn(async (opts: StructuredCallOptions<any, any>) => {
    calls.push(opts);
    return impl(opts);
  });
  return { ai: { isConfigured: true, modelName: 'claude-haiku-4-5', structured } as unknown as AiProviderService, calls };
}

const res = (data: unknown): StructuredCallResult<any> => ({ data, model: 'claude-haiku-4-5', inputTokens: 100, outputTokens: 400, cacheReadTokens: 0, cacheWriteTokens: 0 });

describe('RoadmapGenerator', () => {
  it('sends the course + curriculum as the prompt and returns the sanitized roadmap', async () => {
    const { ai, calls } = fakeAi(() => res(VALID_ROADMAP));
    const gen = new RoadmapGenerator(ai);

    const out = await gen.generate(COURSE);

    expect(calls).toHaveLength(1);
    expect(calls[0].user).toContain('Full-Stack Web Development');
    expect(calls[0].user).toContain('Intro to HTML');
    expect(calls[0].user).toContain('Building REST APIs');
    expect(calls[0].effort).toBe('low');
    // the fact-check-style guard strips the invented lesson title from the Intermediate node's chip
    expect(out.roadmap.phases[1].nodes[0].chips[0].lessonTitles).toEqual(['Node.js Fundamentals', 'Building REST APIs']);
    expect(out.roadmap.phases).toHaveLength(3);
    expect(out.usage).toMatchObject({ model: 'claude-haiku-4-5', inputTokens: 100, outputTokens: 400 });
  });

  it('passes the abort signal through to the AI call', async () => {
    const { ai, calls } = fakeAi(() => res(VALID_ROADMAP));
    const gen = new RoadmapGenerator(ai);
    const controller = new AbortController();

    await gen.generate(COURSE, controller.signal);

    expect(calls[0].signal).toBe(controller.signal);
  });

  it('propagates an AiProviderError from the AI call unchanged', async () => {
    const ai = { isConfigured: true, modelName: 'x', structured: jest.fn().mockRejectedValue(new AiProviderError('refused', 'no', false)) } as unknown as AiProviderService;
    const gen = new RoadmapGenerator(ai);
    await expect(gen.generate(COURSE)).rejects.toMatchObject({ code: 'refused' });
  });

  it('exposes isConfigured from the underlying AI provider', () => {
    const notConfigured = { isConfigured: false, modelName: 'x', structured: jest.fn() } as unknown as AiProviderService;
    expect(new RoadmapGenerator(notConfigured).isConfigured).toBe(false);
  });

  it('handles a course with no curriculum yet without crashing the prompt builder', async () => {
    const { ai } = fakeAi(() => res(VALID_ROADMAP));
    const gen = new RoadmapGenerator(ai);
    await expect(gen.generate({ ...COURSE, sections: [] })).resolves.toBeDefined();
  });
});
