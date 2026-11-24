import { IImageProvider, IVideoProvider, GeneratedMediaResult, MockImageProvider, MockVideoProvider } from './image-provider.js';
import { getEnv } from '../config/env.js';
import { getStorageProvider } from '../storage/storage-factory.js';
import { MediaValidator } from './media-validator.js';
import { Platform } from '../core/types/index.js';
import { logger } from '../core/logger/index.js';

export interface MediaPackage {
  imageUrl?: string;
  videoUrl?: string;
  imageGenerated: boolean;
  videoGenerated: boolean;
  errors: string[];
}

export class MediaManager {
  private imageProvider: IImageProvider;
  private videoProvider: IVideoProvider;
  private validator = new MediaValidator();

  constructor() {
    const env = getEnv();
    // Future: instantiate real providers based on env.IMAGE_PROVIDER
    this.imageProvider = new MockImageProvider();
    this.videoProvider = new MockVideoProvider();
  }

  async generateAndUploadImage(
    prompt: string,
    platform: Platform,
    dryRun = false
  ): Promise<{ url?: string; error?: string }> {
    try {
      const result = await this.imageProvider.generateImage(prompt, { width: 1024, height: 1024 });
      const validation = this.validator.validateForPlatform(result, platform);

      if (!validation.valid) {
        logger.warn('Generated image failed platform validation', {
          platform,
          errors: validation.errors,
        });
        return { error: validation.errors.join('; ') };
      }

      if (dryRun || !result.localPath) {
        logger.info('[DRY RUN] Image generated (not uploaded)', { provider: result.provider });
        return { url: 'https://placeholder.media/image.jpg' };
      }

      const storage = getStorageProvider();
      const uploaded = await storage.upload(result.localPath, {
        mimeType: result.mimeType,
        folder: `posts/${platform}`,
      });

      return { url: uploaded.publicUrl };
    } catch (err) {
      logger.warn('Image generation failed', { error: String(err), platform });
      return { error: String(err) };
    }
  }

  async generateAndUploadVideo(
    prompt: string,
    dryRun = false
  ): Promise<{ url?: string; error?: string }> {
    try {
      const result = await this.videoProvider.generateVideo(prompt);

      if (dryRun || !result.localPath) {
        logger.info('[DRY RUN] Video generated (not uploaded)');
        return { url: 'https://placeholder.media/video.mp4' };
      }

      const storage = getStorageProvider();
      const uploaded = await storage.upload(result.localPath, { mimeType: result.mimeType });
      return { url: uploaded.publicUrl };
    } catch (err) {
      logger.warn('Video generation failed', { error: String(err) });
      return { error: String(err) };
    }
  }
}
