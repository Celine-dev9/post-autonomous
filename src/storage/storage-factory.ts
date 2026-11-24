import { IStorageProvider, MockStorageProvider } from './storage-provider.js';
import { CloudinaryProvider } from './cloudinary-provider.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

let storageInstance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (storageInstance) return storageInstance;

  const env = getEnv();

  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    try {
      storageInstance = new CloudinaryProvider();
      logger.info('Initialized Cloudinary storage provider');
      return storageInstance;
    } catch (err) {
      logger.warn('Cloudinary initialization failed, using Mock storage', { error: String(err) });
    }
  }

  logger.info('Using Mock storage provider (dev/test mode)');
  storageInstance = new MockStorageProvider();
  return storageInstance;
}
