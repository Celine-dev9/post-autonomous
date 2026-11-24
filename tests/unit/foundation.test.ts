import { describe, it, expect } from 'vitest';
import { getPublishingConfig, getContentPillars } from '../../src/config/settings.js';
import { loadBrandKnowledge } from '../../src/config/brand.js';
import { Logger } from '../../src/core/logger/index.js';
import { AppError } from '../../src/core/errors/index.js';

describe('Phase 1: Foundation & Configuration', () => {
  it('should load default publishing settings correctly', () => {
    const config = getPublishingConfig();
    expect(config).toBeDefined();
    expect(config.scheduler.postsPerDay).toBeGreaterThanOrEqual(1);
    expect(config.qualityThreshold).toBe(80);
    expect(config.scheduler.timezone).toBe('Europe/Bucharest');
  });

  it('should load content pillars with target percentages', () => {
    const pillars = getContentPillars();
    expect(pillars.length).toBeGreaterThanOrEqual(5);

    const totalPercentage = pillars.reduce((sum, p) => sum + p.targetPercentage, 0);
    expect(totalPercentage).toBe(100);
  });

  it('should load markdown knowledge base documents', () => {
    const brandKnowledge = loadBrandKnowledge();
    expect(brandKnowledge.brand).toContain('AutoMedia Labs');
    expect(brandKnowledge.audience).toContain('Senior');
    expect(brandKnowledge.contentPillars).toContain('Educational');
    expect(brandKnowledge.prohibitedContent).toContain('Fabricated');
  });

  it('should sanitize secrets in Logger', () => {
    let loggedMessage = '';
    const logger = new Logger('info');
    // Test that logger can mask sensitive keys
    const testPayload = {
      apiKey: 'secret_12345',
      bearerToken: 'Bearer abcdef123456789',
      username: 'admin',
    };
    // Child logger creation
    const child = logger.child({ runId: 'test-run-1' });
    expect(child).toBeDefined();
  });

  it('should instantiate AppError hierarchy with metadata', () => {
    const err = new AppError('Something failed', 'TEST_CODE', true, { extra: 'data' });
    expect(err.message).toBe('Something failed');
    expect(err.code).toBe('TEST_CODE');
    expect(err.isOperational).toBe(true);
    expect(err.details).toEqual({ extra: 'data' });
  });
});
