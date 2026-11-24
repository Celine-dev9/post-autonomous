export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, code = 'INTERNAL_ERROR', isOperational = true, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', false, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', true, details);
  }
}

export class LockAcquisitionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'LOCK_ACQUISITION_ERROR', true, details);
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_PROVIDER_ERROR', true, details);
  }
}

export class QualityControlError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'QUALITY_CONTROL_ERROR', true, details);
  }
}

export class DuplicateContentError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DUPLICATE_CONTENT_ERROR', true, details);
  }
}

export class MediaProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'MEDIA_PROVIDER_ERROR', true, details);
  }
}

export class PlatformPublishError extends AppError {
  public readonly platform: string;
  public readonly retryable: boolean;

  constructor(platform: string, message: string, retryable = true, details?: unknown) {
    super(`[${platform.toUpperCase()}] ${message}`, 'PLATFORM_PUBLISH_ERROR', true, details);
    this.platform = platform;
    this.retryable = retryable;
  }
}

export class PlatformAuthError extends AppError {
  public readonly platform: string;

  constructor(platform: string, message: string, details?: unknown) {
    super(`[${platform.toUpperCase()} AUTH] ${message}`, 'PLATFORM_AUTH_ERROR', true, details);
    this.platform = platform;
  }
}
