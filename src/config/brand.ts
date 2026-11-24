import fs from 'fs';
import path from 'path';

export interface BrandKnowledge {
  brand: string;
  audience: string;
  strategy: string;
  contentPillars: string;
  prohibitedContent: string;
  callToAction: string;
  systemPrompt: string;
}

let cachedBrandKnowledge: BrandKnowledge | null = null;

function readMarkdownFile(filePath: string, fallback: string): string {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // Return fallback on read error
  }
  return fallback;
}

export function loadBrandKnowledge(): BrandKnowledge {
  if (cachedBrandKnowledge) return cachedBrandKnowledge;

  const baseDir = process.cwd();

  const brand = readMarkdownFile(
    path.resolve(baseDir, 'knowledge', 'brand.md'),
    'Brand: AutoMedia Labs. High-signal engineering authority.'
  );

  const audience = readMarkdownFile(
    path.resolve(baseDir, 'knowledge', 'audience.md'),
    'Audience: Senior developers, architects, and technical leaders.'
  );

  const strategy = readMarkdownFile(
    path.resolve(baseDir, 'knowledge', 'strategy.md'),
    'Strategy: Pragmatic, insight-driven technical breakdowns.'
  );

  const contentPillars = readMarkdownFile(
    path.resolve(baseDir, 'knowledge', 'content-pillars.md'),
    'Pillars: Educational, News, Tutorials, Thought Leadership, Case Studies.'
  );

  const prohibitedContent = readMarkdownFile(
    path.resolve(baseDir, 'knowledge', 'prohibited-content.md'),
    'Prohibited: Fake facts, fabricated quotes, hyperbolic buzzwords.'
  );

  const callToAction = readMarkdownFile(
    path.resolve(baseDir, 'knowledge', 'call-to-action.md'),
    'CTAs: Thoughtful discussion, bookmarking, documentation links.'
  );

  const systemPrompt = readMarkdownFile(
    path.resolve(baseDir, 'prompts', 'brand-system.md'),
    'You are the Chief AI Content Architect for AutoMedia Labs.'
  );

  cachedBrandKnowledge = {
    brand,
    audience,
    strategy,
    contentPillars,
    prohibitedContent,
    callToAction,
    systemPrompt,
  };

  return cachedBrandKnowledge;
}
