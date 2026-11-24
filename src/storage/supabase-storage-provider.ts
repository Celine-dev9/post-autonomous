import { IStorageProvider, UploadResult } from './storage-provider.js';
import { getSupabaseRawClient } from '../database/client.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';
import fs from 'fs';
import path from 'path';

export class SupabaseStorageProvider implements IStorageProvider {
  public readonly name = 'supabase';
  private bucketName = 'media';

  async upload(
    localPath: string,
    options?: { mimeType?: string; folder?: string }
  ): Promise<UploadResult> {
    const buffer = fs.readFileSync(localPath);
    const filename = path.basename(localPath);
    return this.uploadFromBuffer(buffer, filename, options);
  }

  async uploadFromBuffer(
    buffer: Buffer,
    filename: string,
    options?: { mimeType?: string; folder?: string }
  ): Promise<UploadResult> {
    const supabase = getSupabaseRawClient();
    if (!supabase) {
      throw new Error('Supabase client is not available. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    const folder = options?.folder ? `${options.folder}/` : '';
    const filePath = `${folder}${Date.now()}_${filename}`;
    const contentType = options?.mimeType || 'image/jpeg';

    logger.info('Uploading media to Supabase Storage', { bucket: this.bucketName, path: filePath });

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return {
      id: data?.path || filePath,
      publicUrl: urlData.publicUrl,
      mimeType: contentType,
      sizeBytes: buffer.length,
    };
  }

  async delete(publicId: string): Promise<void> {
    const supabase = getSupabaseRawClient();
    if (!supabase) return;
    const { error } = await supabase.storage.from(this.bucketName).remove([publicId]);
    if (error) {
      logger.warn('Failed to delete asset from Supabase Storage', { publicId, error: error.message });
    }
  }

  generatePublicUrl(publicId: string): string {
    const env = getEnv();
    if (!env.SUPABASE_URL) return `https://supabase.mock/${publicId}`;
    return `${env.SUPABASE_URL}/storage/v1/object/public/${this.bucketName}/${publicId}`;
  }
}
