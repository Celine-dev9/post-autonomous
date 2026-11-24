import { z } from 'zod';
import { GenerationContext } from '../../knowledge/retrieval.js';

export const MasterContentSchema = z.object({
  topic: z.string().min(5),
  topicRationale: z.string().min(10),
  sourceReferences: z.array(z.string()).default([]),
  contentPillar: z.string(),
  contentAngle: z.string().min(5),
  audience: z.string(),
  mainTakeaway: z.string().min(10),
  hook: z.string().min(10),
  body: z.string().min(50),
  cta: z.string(),
  supportingFacts: z.array(z.string()).min(1),
  mediaConcept: z.string().min(10),
  imagePrompt: z.string().min(10),
  videoConcept: z
    .object({
      title: z.string(),
      hook: z.string(),
      scenes: z.array(
        z.object({
          sceneNumber: z.number(),
          narration: z.string(),
          visualPrompt: z.string(),
        })
      ),
      tags: z.array(z.string()),
      description: z.string(),
    })
    .optional(),
  suggestedHashtags: z.array(z.string()).min(1).max(8),
  keywords: z.array(z.string()).min(2),
  seoKeywords: z.array(z.string()).min(2),
});

export type MasterContentType = z.infer<typeof MasterContentSchema>;

export function buildMasterContentPrompt(
  topic: string,
  angle: string,
  pillarId: string,
  context: GenerationContext,
  sourceUrl?: string
): string {
  return `Generate a comprehensive, high-signal master technical content package for the following topic:

TOPIC: ${topic}
TARGET ANGLE: ${angle}
CONTENT PILLAR: ${pillarId}
${sourceUrl ? `SOURCE REFERENCE: ${sourceUrl}` : ''}

BRAND IDENTITY & POSITIONING:
${context.brandKnowledge.brand}

TARGET AUDIENCE:
${context.brandKnowledge.audience}

PROHIBITIONS & GUARDRAILS:
${context.brandKnowledge.prohibitedContent}

CTA GUIDELINES:
${context.brandKnowledge.callToAction}

RECENT TOPICS TO AVOID DUPLICATING:
${context.recentTopics.length > 0 ? context.recentTopics.map((t) => `- ${t}`).join('\n') : 'None'}

SIMILAR PAST ANGLES (AVOID REPEATING THESE EXACT HOOKS):
${context.similarHistoricalAngles.length > 0 ? context.similarHistoricalAngles.map((a) => `- ${a}`).join('\n') : 'None'}

REQUIREMENTS:
1. Ground the body in real software engineering architectures, protocols, or concrete implementation details.
2. Hook must grab attention without buzzwords or hyperbolic cliches.
3. Include 2-4 supporting facts (architectural trade-offs, standard RFCs/specs, or cited research).
4. Provide a visual media concept and an AI image generation prompt (technical diagram or schematic style).
5. Provide a full YouTube video concept with scene breakdown and voiceover narration.
6. Provide clean, targeted hashtags without spam.`;
}
