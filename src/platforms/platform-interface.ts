import { Platform, PlatformContent, PublishResult, PostAnalytics } from '../../core/types/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ConnectionResult {
  connected: boolean;
  platform: Platform;
  details: string;
  missingCredentials?: string[];
}

export interface PublishOptions {
  dryRun?: boolean;
  idempotencyKey?: string;
  scheduledAt?: Date;
}

export interface IPlatformAdapter {
  platform: Platform;
  validateContent(content: PlatformContent): Promise<ValidationResult>;
  publish(content: PlatformContent, options?: PublishOptions): Promise<PublishResult>;
  getAnalytics?(postId: string): Promise<PostAnalytics>;
  testConnection(): Promise<ConnectionResult>;
}
