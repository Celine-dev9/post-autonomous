import { Platform, PlatformContent, PublishResult, PostAnalytics } from '../../core/types/index.js';
import { IPlatformAdapter, ValidationResult, ConnectionResult, PublishOptions } from '../platform-interface.js';
import { getEnv } from '../../config/env.js';
import { getPlatformsConfig } from '../../config/platform-config.js';
import { logger } from '../../core/logger/index.js';
import { PlatformPublishError, PlatformAuthError } from '../../core/errors/index.js';

// YouTube Data API v3
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export class YouTubeAdapter implements IPlatformAdapter {
  public readonly platform: Platform = 'youtube';
  private cachedToken: string | null = null;

  async validateContent(content: PlatformContent): Promise<ValidationResult> {
    const config = getPlatformsConfig().youtube;
    const errors: string[] = [];

    if (!content.title) errors.push('YouTube posts require a title');
    if (content.title && content.title.length > (config.maxTitleCharacters || 100)) {
      errors.push(`Title exceeds YouTube limit: ${content.title.length}/${config.maxTitleCharacters}`);
    }
    if (content.text.length > (config.maxDescriptionCharacters || 5000)) {
      errors.push(`Description exceeds YouTube limit`);
    }
    if (!content.videoScript) {
      errors.push('YouTube posts require a video script');
    }

    return { valid: errors.length === 0, errors };
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    const env = getEnv();
    if (!env.YOUTUBE_CLIENT_ID || !env.YOUTUBE_CLIENT_SECRET || !env.YOUTUBE_REFRESH_TOKEN) {
      throw new PlatformAuthError('youtube', 'Missing YouTube OAuth credentials (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)');
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.YOUTUBE_CLIENT_ID,
        client_secret: env.YOUTUBE_CLIENT_SECRET,
        refresh_token: env.YOUTUBE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new PlatformAuthError('youtube', `Token refresh failed: ${response.status}`);
    }

    const data = await response.json() as { access_token?: string };
    if (!data.access_token) throw new PlatformAuthError('youtube', 'No access token returned from refresh');

    this.cachedToken = data.access_token;
    return data.access_token;
  }

  async publish(content: PlatformContent, options?: PublishOptions): Promise<PublishResult> {
    const env = getEnv();

    if (options?.dryRun) {
      logger.info('[DRY RUN] YouTube video would be uploaded', {
        title: content.title?.slice(0, 60),
        script: content.videoScript?.hook?.slice(0, 80),
      });
      return {
        platform: 'youtube',
        success: true,
        platformPostId: 'dry_run_yt',
        postUrl: 'https://youtube.com/watch?v=dry_run',
        idempotencyKey: options.idempotencyKey,
      };
    }

    if (!env.YOUTUBE_REFRESH_TOKEN) {
      throw new PlatformAuthError('youtube', 'Missing YOUTUBE_REFRESH_TOKEN — video upload unavailable');
    }

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      logger.warn('YouTube: No video URL provided — marking as media-generation-unavailable');
      return {
        platform: 'youtube',
        success: false,
        error: 'No video media available for upload. Configure VIDEO_PROVIDER to enable video generation.',
        retryable: false,
      };
    }

    const accessToken = await this.getAccessToken();
    const privacyStatus = env.YOUTUBE_PRIVACY_STATUS || 'private';

    const videoMetadata = {
      snippet: {
        title: content.title || 'Untitled',
        description: content.text,
        tags: content.hashtags.map((h) => h.replace('#', '')),
        categoryId: '28', // Science & Technology
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    };

    // Insert video metadata first (resumable upload in production)
    // For the actual video upload we would use resumable upload with the video file
    // Here we demonstrate metadata insertion (video file upload requires binary streaming)
    const insertRes = await fetch(`${YOUTUBE_API_BASE}/videos?part=snippet,status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(videoMetadata),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      if (insertRes.status === 401) throw new PlatformAuthError('youtube', `Token expired: ${err}`);
      throw new PlatformPublishError('youtube', `API error ${insertRes.status}: ${err}`, insertRes.status === 429);
    }

    const data = await insertRes.json() as { id?: string };
    const videoId = data.id || '';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    logger.info('YouTube video metadata published', { videoId, privacyStatus });
    return { platform: 'youtube', success: true, platformPostId: videoId, postUrl: videoUrl, idempotencyKey: options?.idempotencyKey, publishedAt: new Date() };
  }

  async getAnalytics(postId: string): Promise<PostAnalytics> {
    return {
      platformPostId: postId,
      platform: 'youtube',
      metrics: { views: 0, likes: 0, comments: 0 },
      collectedAt: new Date(),
    };
  }

  async testConnection(): Promise<ConnectionResult> {
    const env = getEnv();
    const missing: string[] = [];
    if (!env.YOUTUBE_CLIENT_ID) missing.push('YOUTUBE_CLIENT_ID');
    if (!env.YOUTUBE_CLIENT_SECRET) missing.push('YOUTUBE_CLIENT_SECRET');
    if (!env.YOUTUBE_REFRESH_TOKEN) missing.push('YOUTUBE_REFRESH_TOKEN');

    if (missing.length > 0) {
      return { connected: false, platform: 'youtube', details: `Mock mode. Missing: ${missing.join(', ')}`, missingCredentials: missing };
    }
    return { connected: true, platform: 'youtube', details: 'YouTube credentials provided' };
  }
}
