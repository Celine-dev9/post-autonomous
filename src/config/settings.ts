import fs from 'fs';
import path from 'path';
import { ContentPillar } from '../core/types/index.js';
import { getEnv } from './env.js';

export interface PublishingConfig {
  scheduler: {
    postsPerDay: number;
    times: string[];
    timezone: string;
    randomizeTime: boolean;
    randomWindowMinutes: number;
  };
  qualityThreshold: number;
  maxQualityRetries: number;
  deduplication: {
    lookbackDays: number;
    similarityThreshold: number;
  };
  retryPolicy: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  mediaPolicy: {
    allowTextFallback: boolean;
    requirePublicHttps: boolean;
  };
}

let cachedPublishingConfig: PublishingConfig | null = null;
let cachedPillars: ContentPillar[] | null = null;

export function getPublishingConfig(): PublishingConfig {
  if (cachedPublishingConfig) return cachedPublishingConfig;

  const env = getEnv();
  const filePath = path.resolve(process.cwd(), 'config', 'publishing.json');
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as PublishingConfig;
    // Overlay env settings if provided
    parsed.scheduler.postsPerDay = env.POSTS_PER_DAY || parsed.scheduler.postsPerDay;
    parsed.scheduler.timezone = env.TIMEZONE || parsed.scheduler.timezone;
    parsed.qualityThreshold = env.QUALITY_THRESHOLD || parsed.qualityThreshold;
    cachedPublishingConfig = parsed;
    return parsed;
  }

  // Fallback defaults
  cachedPublishingConfig = {
    scheduler: {
      postsPerDay: env.POSTS_PER_DAY,
      times: [env.POST_TIME_1, env.POST_TIME_2],
      timezone: env.TIMEZONE,
      randomizeTime: env.RANDOMIZE_POST_TIME,
      randomWindowMinutes: env.RANDOM_WINDOW_MINUTES,
    },
    qualityThreshold: env.QUALITY_THRESHOLD,
    maxQualityRetries: 2,
    deduplication: {
      lookbackDays: 30,
      similarityThreshold: 0.75,
    },
    retryPolicy: {
      maxRetries: 3,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 2.0,
    },
    mediaPolicy: {
      allowTextFallback: true,
      requirePublicHttps: true,
    },
  };
  return cachedPublishingConfig;
}

export function getContentPillars(): ContentPillar[] {
  if (cachedPillars) return cachedPillars;

  const filePath = path.resolve(process.cwd(), 'config', 'content-pillars.json');
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    cachedPillars = JSON.parse(raw) as ContentPillar[];
    return cachedPillars;
  }

  // Fallback default pillars
  cachedPillars = [
    {
      id: 'educational-tips',
      name: 'Educational Tips & Best Practices',
      description: 'Actionable advice, tutorials, and practical implementation patterns.',
      targetPercentage: 30,
      targetAudience: 'Developers and AI engineers',
      allowedFormats: ['tutorial', 'tip-list', 'code-concept'],
      preferredPlatforms: ['x', 'linkedin', 'instagram', 'youtube'],
      ctaType: 'save-or-comment',
    },
    {
      id: 'industry-news',
      name: 'Industry News Analysis',
      description: 'Factual breakdowns of major AI breakthroughs and tech trends.',
      targetPercentage: 25,
      targetAudience: 'Tech professionals',
      allowedFormats: ['news-breakdown', 'trend-analysis'],
      preferredPlatforms: ['x', 'linkedin', 'facebook'],
      ctaType: 'discussion',
    },
    {
      id: 'practical-tutorials',
      name: 'Practical Guides',
      description: 'Step-by-step implementation blueprints and architectural pitfalls.',
      targetPercentage: 20,
      targetAudience: 'Software engineers',
      allowedFormats: ['step-by-step', 'cheat-sheet'],
      preferredPlatforms: ['youtube', 'linkedin', 'x'],
      ctaType: 'bookmark-or-share',
    },
    {
      id: 'thought-leadership',
      name: 'Thought Leadership',
      description: 'Perspectives on AI adoption and engineering quality.',
      targetPercentage: 15,
      targetAudience: 'Engineering leads and founders',
      allowedFormats: ['opinion', 'myth-busting'],
      preferredPlatforms: ['linkedin', 'x', 'facebook'],
      ctaType: 'thoughtful-question',
    },
    {
      id: 'case-studies',
      name: 'Case Studies',
      description: 'Real-world architecture postmortems and lessons learned.',
      targetPercentage: 10,
      targetAudience: 'Architects',
      allowedFormats: ['case-study', 'lessons-learned'],
      preferredPlatforms: ['linkedin', 'youtube', 'x'],
      ctaType: 'resource-link',
    },
  ];
  return cachedPillars;
}
