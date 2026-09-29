import { z } from 'zod';

/**
 * The shape we ask Claude to return (structured outputs guarantee valid JSON
 * of this shape). Kept constraint-free on purpose — length/format rules live
 * in `ArticleSchema` below and are enforced after parsing.
 */
export const ArticleWireSchema = z.object({
  title: z.string().describe('Specific, non-clickbait headline, at most 70 characters'),
  content: z.string().describe('Full article in Markdown, 900-1200 words, ## headings, code blocks or lists where useful'),
  metaDescription: z.string().describe('SEO meta description, 140-160 characters'),
  tags: z.array(z.string()).describe('3-5 lowercase tags'),
});

/** What we actually accept and save as a draft. */
export const ArticleSchema = z.object({
  title: z.string().trim().min(10).max(120),
  content: z.string().trim().min(2500).max(20000),
  metaDescription: z.string().trim().min(80).max(200),
  tags: z
    .array(z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,29}$/))
    .min(3)
    .max(5),
});
export type Article = z.infer<typeof ArticleSchema>;

/** Stage 1 output: grounded notes the writer must stick to (kept small on purpose). */
export const ResearchWireSchema = z.object({
  angle: z.string().describe('The specific thesis for the article, one sentence'),
  audience: z.string().describe('Who the article is for, a few words'),
  facts: z
    .array(z.string())
    .describe(
      '8-12 short, concrete factual statements about the topic that you are HIGHLY confident are accurate. Omit anything uncertain. Prefer qualitative truths over precise numbers.',
    ),
  outline: z.array(z.string()).describe('5-7 H2 section headings, in order'),
  seoKeywords: z.array(z.string()).describe('5-8 search keywords'),
});

export const ResearchSchema = z.object({
  angle: z.string().trim().min(5).max(400),
  audience: z.string().trim().min(2).max(200),
  facts: z.array(z.string().trim().min(5).max(400)).min(3).max(15),
  outline: z.array(z.string().trim().min(2).max(150)).min(3).max(8),
  seoKeywords: z.array(z.string().trim().min(2).max(60)).min(3).max(10),
});
export type Research = z.infer<typeof ResearchSchema>;
