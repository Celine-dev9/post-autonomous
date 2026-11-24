import { IStorageProvider, MockStorageProvider } from './storage-provider.js';
import { CloudinaryProvider } from './cloudinary-provider.js';
import { SupabaseStorageProvider } from './supabase-storage-provider.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

let storageInstance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (storageInstance) return storageInstance;

  const env = getEnv();

  // 1. Cloudinary provider
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    try {
      storageInstance = new CloudinaryProvider();
      logger.info('Initialized Cloudinary storage provider');
      return storageInstance;
    } catch (err) {
      logger.warn('Cloudinary initialization failed, falling back', { error: String(err) });
    }
  }

  // 2. Supabase Storage provider
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      storageInstance = new SupabaseStorageProvider();
      logger.info('Initialized Supabase Storage provider');
      return storageInstance;
    } catch (err) {
      logger.warn('Supabase Storage initialization failed, falling back to mock', { error: String(err) });
    }
  }

  // 3. Resilient Mock Storage fallback
  logger.info('Using Mock storage provider (dev/test mode)');
  storageInstance = new MockStorageProvider();
  return storageInstance;
}
