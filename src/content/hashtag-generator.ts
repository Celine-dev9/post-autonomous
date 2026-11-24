import { Platform } from '../core/types/index.js';
import { getPlatformsConfig } from '../config/platform-config.js';

export class HashtagGenerator {
  private static readonly SPAM_TAGS = new Set([
    'followforfollow',
    'f4f',
    'likeforlike',
    'l4l',
    'viral',
    'trending',
    'fyp',
    'explorepage',
    'instadaily',
  ]);

  /**
   * Generates sanitized, platform-optimized hashtags from keywords and content topics.
   */
  generateForPlatform(
    keywords: string[],
    topic: string,
    platform: Platform,
    customTags: string[] = []
  ): string[] {
    const config = getPlatformsConfig()[platform];
    const maxTags = config.maxHashtags || 5;

    const candidates = new Set<string>();

    // 1. Process custom tags first
    for (const tag of customTags) {
      const clean = this.sanitizeTag(tag);
      if (clean && !HashtagGenerator.SPAM_TAGS.has(clean.toLowerCase())) {
        candidates.add(`#${clean}`);
      }
    }

    // 2. Process extracted keywords
    for (const kw of keywords) {
      const clean = this.sanitizeTag(kw);
      if (clean && !HashtagGenerator.SPAM_TAGS.has(clean.toLowerCase())) {
        candidates.add(`#${clean}`);
      }
    }

    // 3. Fallback to topic words if few tags
    if (candidates.size < Math.min(2, maxTags)) {
      const words = topic
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['with', 'from', 'that', 'this', 'your', 'about'].includes(w.toLowerCase()));

      for (const w of words) {
        const clean = this.sanitizeTag(w);
        if (clean) candidates.add(`#${clean}`);
        if (candidates.size >= maxTags) break;
      }
    }

    return Array.from(candidates).slice(0, maxTags);
  }

  private sanitizeTag(tag: string): string {
    const stripped = tag.replace(/^#+/, '').trim();
    // Convert multiple words to PascalCase if spaced
    if (stripped.includes(' ')) {
      return stripped
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
    }
    // Remove special characters
    return stripped.replace(/[^a-zA-Z0-9_]/g, '');
  }
}
