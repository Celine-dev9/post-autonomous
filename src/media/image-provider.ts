// Media Provider Interfaces
export interface ImageOptions {
  width?: number;
  height?: number;
  style?: string;
  format?: 'png' | 'jpeg' | 'webp';
}

export interface VideoOptions {
  durationSeconds?: number;
  resolution?: '1080p' | '720p' | '4k';
  style?: string;
}

export interface GeneratedMediaResult {
  id: string;
  provider: string;
  mediaType: 'image' | 'video';
  localPath?: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface IImageProvider {
  name: string;
  generateImage(prompt: string, options?: ImageOptions): Promise<GeneratedMediaResult>;
}

export interface IVideoProvider {
  name: string;
  generateVideo(prompt: string, options?: VideoOptions): Promise<GeneratedMediaResult>;
}

// Mock Image Provider - returns a placeholder URL for development/testing
export class MockImageProvider implements IImageProvider {
  public readonly name = 'mock';

  async generateImage(prompt: string, options?: ImageOptions): Promise<GeneratedMediaResult> {
    const width = options?.width || 1024;
    const height = options?.height || 1024;
    return {
      id: `mock_img_${Date.now()}`,
      provider: 'mock',
      mediaType: 'image',
      mimeType: 'image/png',
      width,
      height,
      metadata: { prompt: prompt.slice(0, 100), mock: true },
    };
  }
}

// Mock Video Provider - returns stub for development/testing
export class MockVideoProvider implements IVideoProvider {
  public readonly name = 'mock';

  async generateVideo(prompt: string, options?: VideoOptions): Promise<GeneratedMediaResult> {
    return {
      id: `mock_vid_${Date.now()}`,
      provider: 'mock',
      mediaType: 'video',
      mimeType: 'video/mp4',
      width: 1920,
      height: 1080,
      durationSeconds: options?.durationSeconds || 60,
      metadata: { prompt: prompt.slice(0, 100), mock: true },
    };
  }
}
