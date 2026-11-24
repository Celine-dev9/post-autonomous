import { z } from 'zod';
import { MasterContent, Platform } from '../../core/types/index.js';
import { PlatformConfig } from '../../config/platform-config.js';

export const AdaptedContentSchema = z.object({
  platform: z.enum(['x', 'facebook', 'instagram', 'linkedin', 'youtube']),
  title: z.string().optional(),
  text: z.string(),
  hashtags: z.array(z.string()),
  videoScript: z
    .object({
      hook: z.string(),
      scenes: z.array(
        z.object({
          sceneNumber: z.number(),
          narration: z.string(),
          visualPrompt: z.string(),
        })
      ),
      description: z.string(),
      tags: z.array(z.string()),
    })
    .optional(),
});

export function buildAdaptationPrompt(
  content: MasterContent,
  platform: Platform,
  config: PlatformConfig
): string {
  const platformRules: Record<Platform, string> = {
    x: `X (Twitter) Rules:
- Hard character limit: STRICTLY under ${config.maxCharacters || 280} characters total (including text and hashtags).
- Hook: First 5-8 words must instantly grab an engineer's attention.
- Tone: Punchy, high-signal, zero fluff.
- Max hashtags: ${config.maxHashtags} relevant technical tags.`,

    facebook: `Facebook Pages Rules:
- Format: Engaging conversational narrative that prompts comments.
- Paragraphs: Short, readable paragraphs.
- Tone: Insightful, educational, community-oriented.
- Call to action: Natural discussion starter question.
- Max hashtags: ${config.maxHashtags}.`,

    instagram: `Instagram Rules:
- Format: Visually evocative technical breakdown suited to accompany a diagram or carousel slide.
- Formatting: Clean line breaks and bullet points.
- Tone: Clear, accessible, aesthetic engineering breakdown.
- Max hashtags: ${config.maxHashtags} clean tags placed at the bottom.`,

    linkedin: `LinkedIn Rules:
- Format: Professional thought-leadership post.
- Opening: Strong insight hook (2-3 lines before 'see more').
- Body: Architectural rationale, technical trade-offs, and practical lessons.
- Tone: Authoritative, respectful of peers, engineering-first.
- Max hashtags: ${config.maxHashtags}.`,

    youtube: `YouTube Rules:
- Title: High CTR, SEO-optimized title (max ${config.maxTitleCharacters || 100} chars).
- Description: Detailed description including overview, key takeaways, and relevant tags.
- Full Video Script: 2-4 scene breakdown with voiceover narration and visual prompts.
- Tags: Up to ${config.maxTags || 15} relevant tags.`,
  };

  return `Adapt the following master content into a native post for ${platform.toUpperCase()}:

MASTER CONTENT:
Topic: ${content.topic}
Angle: ${content.contentAngle}
Hook: ${content.hook}
Body:
${content.body}
CTA: ${content.cta}
Supporting Facts:
${content.supportingFacts.join('\n')}
Keywords: ${content.keywords.join(', ')}

PLATFORM REQUIREMENTS:
${platformRules[platform]}

Output ONLY a JSON object conforming to the schema.`;
}
