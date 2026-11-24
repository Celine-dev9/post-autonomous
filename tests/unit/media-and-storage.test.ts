import { describe, it, expect, beforeEach } from 'vitest';
import { MediaValidator } from '../../src/media/media-validator.js';
import { MockImageProvider, MockVideoProvider } from '../../src/media/image-provider.js';
import { MockStorageProvider } from '../../src/storage/storage-provider.js';
import { getStorageProvider } from '../../src/storage/storage-factory.js';

describe('Phase 6: Media Generation & Hosting', () => {
  let mediaValidator: MediaValidator;
  let imageProvider: MockImageProvider;
  let videoProvider: MockVideoProvider;
  let storageProvider: MockStorageProvider;

  beforeEach(() => {
    mediaValidator = new MediaValidator();
    imageProvider = new MockImageProvider();
    videoProvider = new MockVideoProvider();
    storageProvider = new MockStorageProvider();
  });

  it('should generate mock image with valid dimensions and metadata', async () => {
    const prompt = 'Futuristic server room visualizing autonomous streaming pipelines';
    const media = await imageProvider.generateImage(prompt, { width: 1080, height: 1080 });

    expect(media.mediaType).toBe('image');
    expect(media.width).toBe(1080);
    expect(media.height).toBe(1080);
    expect(media.mimeType).toBe('image/png');
  });

  it('should generate mock video with duration and resolution', async () => {
    const prompt = 'Explainer video covering idempotency keys in payment APIs';
    const video = await videoProvider.generateVideo(prompt, { durationSeconds: 45 });

    expect(video.mediaType).toBe('video');
    expect(video.durationSeconds).toBe(45);
    expect(video.mimeType).toBe('video/mp4');
  });

  it('should validate media compliance for Instagram and YouTube', async () => {
    const validIgImage = await imageProvider.generateImage('Test image', { width: 1080, height: 1080 });
    const igValidation = mediaValidator.validateForPlatform(validIgImage, 'instagram');
    expect(igValidation.valid).toBe(true);

    const invalidAspectRatioImage = await imageProvider.generateImage('Wide image', { width: 3000, height: 500 });
    const invalidValidation = mediaValidator.validateForPlatform(invalidAspectRatioImage, 'instagram');
    expect(invalidValidation.valid).toBe(false);
  });

  it('should upload media and return public URL from storage provider', async () => {
    const buffer = Buffer.from('fake image binary content');
    const uploaded = await storageProvider.uploadFromBuffer(buffer, 'test-asset.jpg', { mimeType: 'image/jpeg' });

    expect(uploaded.publicUrl).toBeDefined();
    expect(uploaded.publicUrl.startsWith('https://storage.mock.dev/')).toBe(true);
    expect(uploaded.sizeBytes).toBe(buffer.length);
  });

  it('should resolve storage factory instance reliably', () => {
    const storage = getStorageProvider();
    expect(storage).toBeDefined();
    expect(typeof storage.upload).toBe('function');
  });
});
