import { PlatformContent, Platform } from '../core/types/index.js';
import { getPlatformsConfig } from '../config/platform-config.js';

export interface ContentValidationResult {
  valid: boolean;
  platform: Platform;
  errors: string[];
  warnings: string[];
}

export class ContentValidator {
  validatePlatformContent(content: PlatformContent): ContentValidationResult {
    const config = getPlatformsConfig()[content.platform];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Character limit checks
    if (config.maxCharacters && content.text.length > config.maxCharacters) {
      errors.push(
        `Text exceeds ${config.maxCharacters} character limit (${content.text.length} chars)`
      );
    }

    if (config.maxTitleCharacters && content.title && content.title.length > config.maxTitleCharacters) {
      errors.push(`Title exceeds ${config.maxTitleCharacters} chars`);
    }

    // Hashtag limit
    if (content.hashtags.length > config.maxHashtags) {
      errors.push(`Too many hashtags: ${content.hashtags.length} (max ${config.maxHashtags})`);
    }

    // Empty text check
    if (!content.text || content.text.trim().length < 10) {
      errors.push('Post text is too short or empty');
    }

    // YouTube-specific: must have title
    if (content.platform === 'youtube' && !content.title) {
      errors.push('YouTube posts require a title');
    }

    // Check for clichés
    const forbiddenPhrases = [
      "in today's fast-paced",
      "game changer",
      "revolutionize",
      "unlock the power",
      "look no further",
    ];
    for (const phrase of forbiddenPhrases) {
      if (content.text.toLowerCase().includes(phrase)) {
        warnings.push(`Forbidden phrase detected: "${phrase}"`);
      }
    }

    return {
      valid: errors.length === 0,
      platform: content.platform,
      errors,
      warnings,
    };
  }
}
