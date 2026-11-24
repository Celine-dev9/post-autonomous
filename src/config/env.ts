import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TIMEZONE: z.string().default('Europe/Bucharest'),
  DRY_RUN: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // AI Configuration
  AI_PROVIDER: z.enum(['gemini', 'mock']).default('gemini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_TEMPERATURE: z
    .string()
    .default('0.7')
    .transform((val) => parseFloat(val)),
  AI_MAX_RETRIES: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10)),

  // Research Configuration
  RSS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  RSS_SOURCES_PATH: z.string().default('config/rss-sources.json'),
  MAX_ARTICLE_AGE_DAYS: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10)),
  MAX_RESEARCH_ITEMS: z
    .string()
    .default('25')
    .transform((val) => parseInt(val, 10)),

  // Database Configuration
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  DATABASE_FALLBACK_MEMORY: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Media Providers
  IMAGE_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  IMAGE_API_KEY: z.string().optional().default(''),
  VIDEO_PROVIDER: z.enum(['mock', 'none']).default('mock'),
  VIDEO_API_KEY: z.string().optional().default(''),

  // Storage
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  // Scheduler Configuration
  POSTS_PER_DAY: z
    .string()
    .default('2')
    .transform((val) => parseInt(val, 10)),
  POST_TIME_1: z.string().default('10:00'),
  POST_TIME_2: z.string().default('17:00'),
  RANDOMIZE_POST_TIME: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  RANDOM_WINDOW_MINUTES: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10)),

  // Platform Flags & Credentials
  X_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  X_API_KEY: z.string().optional().default(''),
  X_API_SECRET: z.string().optional().default(''),
  X_ACCESS_TOKEN: z.string().optional().default(''),
  X_ACCESS_TOKEN_SECRET: z.string().optional().default(''),

  FACEBOOK_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  FACEBOOK_PAGE_ID: z.string().optional().default(''),
  FACEBOOK_ACCESS_TOKEN: z.string().optional().default(''),

  INSTAGRAM_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  INSTAGRAM_ACCOUNT_ID: z.string().optional().default(''),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional().default(''),

  LINKEDIN_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  LINKEDIN_CLIENT_ID: z.string().optional().default(''),
  LINKEDIN_CLIENT_SECRET: z.string().optional().default(''),
  LINKEDIN_ACCESS_TOKEN: z.string().optional().default(''),
  LINKEDIN_ORGANIZATION_ID: z.string().optional().default(''),
  LINKEDIN_PERSON_URN: z.string().optional().default(''),

  YOUTUBE_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  YOUTUBE_CLIENT_ID: z.string().optional().default(''),
  YOUTUBE_CLIENT_SECRET: z.string().optional().default(''),
  YOUTUBE_REFRESH_TOKEN: z.string().optional().default(''),
  YOUTUBE_PRIVACY_STATUS: z.enum(['private', 'unlisted', 'public']).default('private'),

  // Security & Encryption
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  // Alerts & Quality
  ALERT_WEBHOOK_URL: z.string().optional().default(''),
  QUALITY_THRESHOLD: z
    .string()
    .default('80')
    .transform((val) => parseInt(val, 10)),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;

export function getEnv(): EnvConfig {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Environment validation error:', result.error.format());
      throw new Error(`Invalid environment configuration: ${JSON.stringify(result.error.format())}`);
    }
    parsedEnv = result.data;
  }
  return parsedEnv;
}
