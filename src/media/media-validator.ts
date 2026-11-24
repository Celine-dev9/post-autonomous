import { GeneratedMediaResult } from './image-provider.js';
import { Platform } from '../core/types/index.js';

export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
}

interface PlatformMediaRequirements {
  image: {
    maxSizeBytes: number;
    maxWidth: number;
    minWidth: number;
    supportedFormats: string[];
    supportedAspectRatios?: string[];
  };
  video: {
    maxSizeBytes: number;
    maxDurationSeconds: number;
    supportedFormats: string[];
  };
}

const PLATFORM_REQUIREMENTS: Record<Platform, PlatformMediaRequirements> = {
  x: {
    image: { maxSizeBytes: 5 * 1024 * 1024, maxWidth: 4096, minWidth: 100, supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    video: { maxSizeBytes: 512 * 1024 * 1024, maxDurationSeconds: 140, supportedFormats: ['video/mp4'] },
  },
  facebook: {
    image: { maxSizeBytes: 10 * 1024 * 1024, maxWidth: 8192, minWidth: 100, supportedFormats: ['image/jpeg', 'image/png'] },
    video: { maxSizeBytes: 1024 * 1024 * 1024, maxDurationSeconds: 14400, supportedFormats: ['video/mp4'] },
  },
  instagram: {
    image: {
      maxSizeBytes: 8 * 1024 * 1024,
      maxWidth: 1440,
      minWidth: 320,
      supportedFormats: ['image/jpeg', 'image/png'],
      supportedAspectRatios: ['1:1', '4:5', '9:16'],
    },
    video: { maxSizeBytes: 100 * 1024 * 1024, maxDurationSeconds: 60, supportedFormats: ['video/mp4'] },
  },
  linkedin: {
    image: { maxSizeBytes: 10 * 1024 * 1024, maxWidth: 7680, minWidth: 200, supportedFormats: ['image/jpeg', 'image/png'] },
    video: { maxSizeBytes: 200 * 1024 * 1024, maxDurationSeconds: 600, supportedFormats: ['video/mp4'] },
  },
  youtube: {
    image: { maxSizeBytes: 2 * 1024 * 1024, maxWidth: 2560, minWidth: 1280, supportedFormats: ['image/jpeg', 'image/png'] }, // thumbnail
    video: { maxSizeBytes: 128 * 1024 * 1024 * 1024, maxDurationSeconds: 43200, supportedFormats: ['video/mp4', 'video/mov', 'video/avi'] },
  },
};

export class MediaValidator {
  validateForPlatform(media: GeneratedMediaResult, platform: Platform): MediaValidationResult {
    const errors: string[] = [];
    const req = PLATFORM_REQUIREMENTS[platform];

    if (media.mediaType === 'image') {
      const imgReq = req.image;

      if (!imgReq.supportedFormats.includes(media.mimeType)) {
        errors.push(`Unsupported image format ${media.mimeType} for ${platform}. Supported: ${imgReq.supportedFormats.join(', ')}`);
      }

      if (media.sizeBytes && media.sizeBytes > imgReq.maxSizeBytes) {
        errors.push(`Image size ${(media.sizeBytes / 1024 / 1024).toFixed(1)}MB exceeds ${platform} limit of ${(imgReq.maxSizeBytes / 1024 / 1024).toFixed(0)}MB`);
      }

      if (media.width && (media.width > imgReq.maxWidth || media.width < imgReq.minWidth)) {
        errors.push(`Image width ${media.width}px out of allowed range (${imgReq.minWidth}-${imgReq.maxWidth}px) for ${platform}`);
      }
    } else if (media.mediaType === 'video') {
      const vidReq = req.video;

      if (!vidReq.supportedFormats.includes(media.mimeType)) {
        errors.push(`Unsupported video format ${media.mimeType} for ${platform}`);
      }

      if (media.durationSeconds && media.durationSeconds > vidReq.maxDurationSeconds) {
        errors.push(`Video duration ${media.durationSeconds}s exceeds ${platform} limit of ${vidReq.maxDurationSeconds}s`);
      }

      if (media.sizeBytes && media.sizeBytes > vidReq.maxSizeBytes) {
        errors.push(`Video size exceeds ${platform} limit`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
