import fs from 'fs';
import path from 'path';
import { Platform } from '../core/types/index.js';
import { getEnv } from './env.js';

export interface PlatformConfig {
  enabled: boolean;
  maxCharacters?: number;
  maxTitleCharacters?: number;
  maxDescriptionCharacters?: number;
  maxHashtags: number;
  maxTags?: number;
  mediaTypes: Array<'image' | 'video'>;
  requiresPublicHttps?: boolean;
  supportedAspectRatios?: string[];
  defaultPrivacyStatus?: 'private' | 'unlisted' | 'public';
  rateLimitPerWindow?: number;
}

export type PlatformsConfigMap = Record<Platform, PlatformConfig>;

let cachedPlatformsConfig: PlatformsConfigMap | null = null;

export function getPlatformsConfig(): PlatformsConfigMap {
  if (cachedPlatformsConfig) return cachedPlatformsConfig;

  const env = getEnv();
  const filePath = path.resolve(process.cwd(), 'config', 'platforms.json');

  let baseConfig: PlatformsConfigMap;

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    baseConfig = JSON.parse(raw) as PlatformsConfigMap;
  } else {
    baseConfig = {
      x: {
        enabled: true,
        maxCharacters: 280,
        maxHashtags: 3,
        mediaTypes: ['image'],
        rateLimitPerWindow: 50,
      },
      facebook: {
        enabled: true,
        maxCharacters: 5000,
        maxHashtags: 5,
        mediaTypes: ['image', 'video'],
        rateLimitPerWindow: 100,
      },
      instagram: {
        enabled: true,
        maxCharacters: 2200,
        maxHashtags: 8,
        mediaTypes: ['image', 'video'],
        requiresPublicHttps: true,
        supportedAspectRatios: ['1:1', '4:5', '9:16'],
      },
      linkedin: {
        enabled: true,
        maxCharacters: 3000,
        maxHashtags: 5,
        mediaTypes: ['image', 'video'],
        rateLimitPerWindow: 40,
      },
      youtube: {
        enabled: true,
        maxTitleCharacters: 100,
        maxDescriptionCharacters: 5000,
        maxHashtags: 5,
        maxTags: 15,
        mediaTypes: ['video'],
        defaultPrivacyStatus: 'private',
      },
    };
  }

  // Override enabled state from environment variables
  baseConfig.x.enabled = env.X_ENABLED;
  baseConfig.facebook.enabled = env.FACEBOOK_ENABLED;
  baseConfig.instagram.enabled = env.INSTAGRAM_ENABLED;
  baseConfig.linkedin.enabled = env.LINKEDIN_ENABLED;
  baseConfig.youtube.enabled = env.YOUTUBE_ENABLED;

  cachedPlatformsConfig = baseConfig;
  return cachedPlatformsConfig;
}

export function isPlatformConfigured(platform: Platform): { configured: boolean; missingVars: string[] } {
  const env = getEnv();
  const missing: string[] = [];

  switch (platform) {
    case 'x':
      if (!env.X_API_KEY) missing.push('X_API_KEY');
      if (!env.X_API_SECRET) missing.push('X_API_SECRET');
      if (!env.X_ACCESS_TOKEN) missing.push('X_ACCESS_TOKEN');
      if (!env.X_ACCESS_TOKEN_SECRET) missing.push('X_ACCESS_TOKEN_SECRET');
      break;

    case 'facebook':
      if (!env.FACEBOOK_PAGE_ID) missing.push('FACEBOOK_PAGE_ID');
      if (!env.FACEBOOK_ACCESS_TOKEN) missing.push('FACEBOOK_ACCESS_TOKEN');
      break;

    case 'instagram':
      if (!env.INSTAGRAM_ACCOUNT_ID) missing.push('INSTAGRAM_ACCOUNT_ID');
      if (!env.INSTAGRAM_ACCESS_TOKEN) missing.push('INSTAGRAM_ACCESS_TOKEN');
      break;

    case 'linkedin':
      if (!env.LINKEDIN_ACCESS_TOKEN) missing.push('LINKEDIN_ACCESS_TOKEN');
      if (!env.LINKEDIN_ORGANIZATION_ID && !env.LINKEDIN_PERSON_URN) {
        missing.push('LINKEDIN_ORGANIZATION_ID or LINKEDIN_PERSON_URN');
      }
      break;

    case 'youtube':
      if (!env.YOUTUBE_CLIENT_ID) missing.push('YOUTUBE_CLIENT_ID');
      if (!env.YOUTUBE_CLIENT_SECRET) missing.push('YOUTUBE_CLIENT_SECRET');
      if (!env.YOUTUBE_REFRESH_TOKEN) missing.push('YOUTUBE_REFRESH_TOKEN');
      break;
  }

  return {
    configured: missing.length === 0,
    missingVars: missing,
  };
}
