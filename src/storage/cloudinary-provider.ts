import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { IStorageProvider, UploadResult } from './storage-provider.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export class CloudinaryProvider implements IStorageProvider {
  public readonly name = 'cloudinary';

  constructor() {
    const env = getEnv();
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async upload(localPath: string, options?: { mimeType?: string; folder?: string }): Promise<UploadResult> {
    const result: UploadApiResponse = await cloudinary.uploader.upload(localPath, {
      folder: options?.folder || 'autonomous-publisher',
      resource_type: 'auto',
    });

    return this.mapResult(result, options?.mimeType);
  }

  async uploadFromBuffer(buffer: Buffer, filename: string, options?: { mimeType?: string; folder?: string }): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder || 'autonomous-publisher',
          public_id: filename.replace(/\.[^/.]+$/, ''),
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
          resolve(this.mapResult(result, options?.mimeType));
        }
      );
      uploadStream.end(buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      logger.warn(`Cloudinary delete failed for ${publicId}`, { error: String(err) });
    }
  }

  generatePublicUrl(publicId: string): string {
    return cloudinary.url(publicId, { secure: true });
  }

  private mapResult(result: UploadApiResponse, mimeType?: string): UploadResult {
    return {
      id: result.public_id,
      publicUrl: result.secure_url,
      mimeType: mimeType || result.format ? `image/${result.format}` : 'application/octet-stream',
      sizeBytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  }
}
