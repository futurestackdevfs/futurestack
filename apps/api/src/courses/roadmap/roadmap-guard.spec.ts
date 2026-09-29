import { sanitizeRoadmapLessonTitles } from './roadmap-guard';
import { Roadmap } from './roadmap-schemas';

const roadmap: Roadmap = {
  title: 'Frontend Developer Roadmap',
  summary: 'From zero to job-ready.',
  prerequisites: ['HTML', 'CSS'],
  phases: [
    {
      phase: 'Beginner',
      nodes: [
        {
          title: 'HTML & CSS',
          description: 'Build the structure',
          chips: [{ title: 'Flexbox', kind: 'must', lessonTitles: ['Intro to HTML', 'invented lesson that does not exist'] }],
        },
      ],
    },
    {
      phase: 'Intermediate',
      nodes: [
        {
          title: 'React',
          description: 'Build UI components',
          chips: [{ title: 'Hooks', kind: 'must', lessonTitles: ['  intro to react  '] }],
        },
      ],
    },
  ],
};

describe('sanitizeRoadmapLessonTitles', () => {
  it('drops lesson titles that are not an exact match to the real curriculum', () => {
    const out = sanitizeRoadmapLessonTitles(roadmap, ['Intro to HTML', 'Intro to React']);
    expect(out.phases[0].nodes[0].chips[0].lessonTitles).toEqual(['Intro to HTML']);
  });

  it('matches case- and whitespace-insensitively but keeps the real casing', () => {
    const out = sanitizeRoadmapLessonTitles(roadmap, ['Intro to HTML', 'Intro to React']);
    expect(out.phases[1].nodes[0].chips[0].lessonTitles).toEqual(['Intro to React']);
  });

  it('leaves everything else (summary, titles, kind) untouched', () => {
    const out = sanitizeRoadmapLessonTitles(roadmap, []);
    expect(out.summary).toBe(roadmap.summary);
    expect(out.phases[0].nodes[0].title).toBe('HTML & CSS');
    expect(out.phases[0].nodes[0].chips[0].kind).toBe('must');
  });

  it('results in an empty array when nothing matches', () => {
    const out = sanitizeRoadmapLessonTitles(roadmap, []);
    expect(out.phases[0].nodes[0].chips[0].lessonTitles).toEqual([]);
  });
});
