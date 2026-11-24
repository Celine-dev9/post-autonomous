// Storage Provider Interface
export interface UploadResult {
  id: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface IStorageProvider {
  name: string;
  upload(localPath: string, options?: { mimeType?: string; folder?: string }): Promise<UploadResult>;
  uploadFromBuffer(buffer: Buffer, filename: string, options?: { mimeType?: string; folder?: string }): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
  generatePublicUrl(publicId: string): string;
}

// Mock Storage Provider for development & testing
export class MockStorageProvider implements IStorageProvider {
  public readonly name = 'mock';

  async upload(localPath: string, options?: { mimeType?: string }): Promise<UploadResult> {
    const id = `mock_${Date.now()}`;
    return {
      id,
      publicUrl: `https://storage.mock.dev/${id}.jpg`,
      mimeType: options?.mimeType || 'image/jpeg',
      sizeBytes: 1024 * 100,
    };
  }

  async uploadFromBuffer(buffer: Buffer, filename: string, options?: { mimeType?: string }): Promise<UploadResult> {
    const id = `mock_${Date.now()}_${filename}`;
    return {
      id,
      publicUrl: `https://storage.mock.dev/${id}`,
      mimeType: options?.mimeType || 'image/jpeg',
      sizeBytes: buffer.length,
    };
  }

  async delete(publicId: string): Promise<void> {
    // No-op for mock
  }

  generatePublicUrl(publicId: string): string {
    return `https://storage.mock.dev/${publicId}`;
  }
}
