import { z } from 'zod';
import { ContentPillar } from '../../core/types/index.js';
import { BrandKnowledge } from '../../config/brand.js';

export const TopicCandidateSchema = z.object({
  topic: z.string().min(5),
  angle: z.string().min(10),
  pillarId: z.string(),
  reasoning: z.string().min(10),
  relevanceScore: z.number().min(0).max(100),
  freshnessScore: z.number().min(0).max(100),
});

export const TopicListSchema = z.object({
  topics: z.array(TopicCandidateSchema).min(1),
});

export function buildTopicIdeationPrompt(
  pillar: ContentPillar,
  brandKnowledge: BrandKnowledge,
  recentUsedTopics: string[],
  count = 3
): string {
  return `Generate ${count} original, high-value technical content topic ideas for:

TARGET CONTENT PILLAR:
Name: ${pillar.name}
Description: ${pillar.description}
Allowed Formats: ${pillar.allowedFormats.join(', ')}

BRAND POSITIONING:
${brandKnowledge.brand}

AUDIENCE:
${brandKnowledge.audience}

RECENT TOPICS PREVIOUSLY PUBLISHED (DO NOT REPEAT):
${recentUsedTopics.length > 0 ? recentUsedTopics.map((t) => `- ${t}`).join('\n') : 'No recent topics recorded'}

CRITERIA:
1. Topics must be timely, practical, and highly relevant to senior developers and AI architects.
2. Formulate a specific, provocative, or non-obvious angle for each topic.
3. Score relevance and freshness from 0 to 100 based on current engineering challenges.`;
}
