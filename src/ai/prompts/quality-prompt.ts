import { z } from 'zod';
import { MasterContent } from '../../core/types/index.js';
import { BrandKnowledge } from '../../config/brand.js';

export const QualityAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  issues: z.array(z.string()),
  factualConcerns: z.array(z.string()),
  brandConcerns: z.array(z.string()),
  duplicateConcerns: z.array(z.string()),
  platformConcerns: z.array(z.string()),
  recommendedCorrections: z.array(z.string()),
});

export type QualityAssessmentType = z.infer<typeof QualityAssessmentSchema>;

export function buildQualityAuditPrompt(
  content: MasterContent,
  brandKnowledge: BrandKnowledge,
  threshold = 80
): string {
  return `Act as an uncompromising Senior Technical Editor and Fact-Checking QA Specialist.
Audit the following master content package against strict brand and technical guidelines.

MASTER CONTENT PACKAGE:
Topic: ${content.topic}
Angle: ${content.contentAngle}
Hook: ${content.hook}
Body:
${content.body}
CTA: ${content.cta}
Supporting Facts:
${content.supportingFacts.join('\n')}

BRAND GUIDELINES:
${brandKnowledge.brand}

PROHIBITIONS:
${brandKnowledge.prohibitedContent}

QUALITY THRESHOLD: ${threshold}/100

EVALUATION RUBRIC:
1. Factual Accuracy: Are there fabricated stats, fake benchmark claims, or fake firsthand testing? (Immediate failure if detected)
2. Hype & Buzzwords: Are forbidden phrases like "in today's fast-paced world", "game changer", or "revolutionary" used?
3. Signal-to-Noise: Does the content teach a real engineering pattern or is it superficial fluff?
4. Tone & Audience: Is it tailored to senior engineers rather than generic beginner tutorials?

Output a JSON assessment with score (0-100), passed (score >= ${threshold} and no factual concerns), and specific issues/corrections.`;
}
