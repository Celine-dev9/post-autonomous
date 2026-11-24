import { MasterContent, Platform, PlatformContent } from '../core/types/index.js';
import { ContentValidator } from './content-validator.js';
import { HashtagGenerator } from './hashtag-generator.js';
import { ContentGenerator } from './content-generator.js';
import { getPlatformsConfig } from '../config/platform-config.js';
import { logger } from '../core/logger/index.js';

export interface AdaptationResult {
  platform: Platform;
  content: PlatformContent;
  isValid: boolean;
  errors: string[];
}

export class ContentAdapter {
  private validator = new ContentValidator();
  private hashtagGen = new HashtagGenerator();
  private generator = new ContentGenerator();

  /**
   * Adapts master content specifically for a given platform, adhering to tone,
   * length constraints, media references, and hashtag strategy.
   */
  async adapt(content: MasterContent, platform: Platform): Promise<AdaptationResult> {
    const config = getPlatformsConfig()[platform];
    logger.info(`Adapting content for platform: ${platform}`, { topic: content.topic });

    let adaptedContent: PlatformContent;
    try {
      adaptedContent = await this.generator.adaptForPlatform(content, platform);
    } catch (err) {
      logger.warn(`AI adaptation failed for ${platform}, generating deterministic fallback variant`, {
        error: String(err),
      });
      adaptedContent = this.createFallbackVariant(content, platform);
    }

    // Ensure hashtags meet platform rules
    if (!adaptedContent.hashtags || adaptedContent.hashtags.length === 0) {
      adaptedContent.hashtags = this.hashtagGen.generateForPlatform(
        content.suggestedHashtags || content.keywords || [],
        content.topic,
        platform
      );
    } else {
      adaptedContent.hashtags = this.hashtagGen.generateForPlatform(
        adaptedContent.hashtags,
        content.topic,
        platform
      );
    }

    // Enforce character limit clipping for strict platforms like X
    if (platform === 'x') {
      const maxChars = config.maxCharacters || 280;
      const tagsSuffix = adaptedContent.hashtags.length > 0 ? `\n\n${adaptedContent.hashtags.join(' ')}` : '';
      const allowedBodyLen = maxChars - tagsSuffix.length - 5;
      if (adaptedContent.text.length > allowedBodyLen) {
        adaptedContent.text = adaptedContent.text.slice(0, allowedBodyLen).trim() + '...';
      }
      adaptedContent.characterCount = adaptedContent.text.length + tagsSuffix.length;
    }

    // Validate adapted content
    const validation = this.validator.validatePlatformContent(adaptedContent);

    return {
      platform,
      content: adaptedContent,
      isValid: validation.valid,
      errors: validation.errors,
    };
  }

  /**
   * Adapts master content across all specified platforms.
   */
  async adaptAll(
    content: MasterContent,
    platforms: Platform[]
  ): Promise<Map<Platform, PlatformContent>> {
    const results = new Map<Platform, PlatformContent>();

    for (const platform of platforms) {
      const result = await this.adapt(content, platform);
      if (result.isValid) {
        results.set(platform, result.content);
      } else {
        logger.warn(`Validation failed for ${platform}: ${result.errors.join(', ')}`);
        // Provide repaired variant if minor issues
        results.set(platform, result.content);
      }
    }

    return results;
  }

  private createFallbackVariant(content: MasterContent, platform: Platform): PlatformContent {
    const tags = this.hashtagGen.generateForPlatform(
      content.suggestedHashtags || [],
      content.topic,
      platform
    );

    switch (platform) {
      case 'x': {
        const body = `${content.hook}\n\n${content.mainTakeaway}`.slice(0, 240);
        return {
          platform: 'x',
          text: body,
          hashtags: tags.slice(0, 2),
          mediaUrls: [],
          characterCount: body.length,
        };
      }
      case 'linkedin': {
        const text = `${content.hook}\n\n${content.body}\n\nKey Takeaway: ${content.mainTakeaway}\n\n${content.cta || ''}`.trim();
        return {
          platform: 'linkedin',
          title: content.topic,
          text,
          hashtags: tags.slice(0, 4),
          mediaUrls: [],
          characterCount: text.length,
        };
      }
      case 'facebook': {
        const text = `${content.hook}\n\n${content.body}\n\nWhat are your thoughts on this? ${content.cta || ''}`.trim();
        return {
          platform: 'facebook',
          text,
          hashtags: tags.slice(0, 3),
          mediaUrls: [],
          characterCount: text.length,
        };
      }
      case 'instagram': {
        const text = `${content.hook}\n.\n${content.body}\n.\n💡 ${content.mainTakeaway}\n.\n${content.cta || 'Save this for later.'}`.trim();
        return {
          platform: 'instagram',
          text,
          hashtags: tags.slice(0, 7),
          mediaUrls: [],
          characterCount: text.length,
        };
      }
      case 'youtube': {
        return {
          platform: 'youtube',
          title: content.topic.slice(0, 95),
          text: `${content.hook}\n\n${content.mainTakeaway}\n\n${content.body}`.slice(0, 4500),
          hashtags: tags.slice(0, 5),
          mediaUrls: [],
          characterCount: content.body.length,
          videoScript: {
            hook: content.hook,
            scenes: [
              { sceneNumber: 1, visualPrompt: content.mediaConcept, narration: content.hook },
              { sceneNumber: 2, visualPrompt: 'Architecture diagram or code illustration', narration: content.body.slice(0, 200) },
              { sceneNumber: 3, visualPrompt: 'Summary slide with key takeaway points', narration: content.mainTakeaway },
            ],
            description: `${content.hook}\n\n${content.mainTakeaway}`,
            tags: tags.map((t) => t.replace('#', '')),
          },
        };
      }
    }
  }
}
