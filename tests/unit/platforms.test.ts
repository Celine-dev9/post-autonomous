import { describe, it, expect } from 'vitest';
import { getPlatformAdapter, getEnabledPlatforms } from '../../src/platforms/platform-registry.js';
import { PlatformContent } from '../../src/core/types/index.js';

describe('Phase 7: Platform Integrations & Adapters', () => {
  const platforms = getEnabledPlatforms();

  it('should register all 5 core platforms', () => {
    expect(platforms).toContain('x');
    expect(platforms).toContain('facebook');
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('linkedin');
    expect(platforms).toContain('youtube');
  });

  it('should execute dry-run publishing safely on X adapter', async () => {
    const adapter = getPlatformAdapter('x');
    const content: PlatformContent = {
      platform: 'x',
      text: 'Autonomous agents must guarantee idempotency across all distributed publishes.',
      hashtags: ['#Architecture'],
      mediaUrls: [],
      characterCount: 95,
    };

    const validation = await adapter.validateContent(content);
    expect(validation.valid).toBe(true);

    const result = await adapter.publish(content, { dryRun: true, idempotencyKey: 'test_key_x' });
    expect(result.success).toBe(true);
    expect(result.platform).toBe('x');
    expect(result.platformPostId).toBeDefined();
  });

  it('should execute dry-run publishing on Facebook adapter', async () => {
    const adapter = getPlatformAdapter('facebook');
    const content: PlatformContent = {
      platform: 'facebook',
      text: 'Today we are exploring event-driven architectures and how to prevent duplicate messages in queues.',
      hashtags: ['#DevOps', '#SoftwareEngineering'],
      mediaUrls: [],
      characterCount: 120,
    };

    const validation = await adapter.validateContent(content);
    expect(validation.valid).toBe(true);

    const result = await adapter.publish(content, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.platform).toBe('facebook');
  });

  it('should execute dry-run publishing on Instagram adapter', async () => {
    const adapter = getPlatformAdapter('instagram');
    const content: PlatformContent = {
      platform: 'instagram',
      text: 'Visualizing distributed transactions with state machines.',
      hashtags: ['#Tech', '#Coding'],
      mediaUrls: ['https://storage.mock.dev/diagram.jpg'],
      characterCount: 80,
    };

    const validation = await adapter.validateContent(content);
    expect(validation.valid).toBe(true);

    const result = await adapter.publish(content, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.platform).toBe('instagram');
  });

  it('should execute dry-run publishing on LinkedIn adapter', async () => {
    const adapter = getPlatformAdapter('linkedin');
    const content: PlatformContent = {
      platform: 'linkedin',
      title: 'Architecting Resilient Background Jobs in TypeScript',
      text: 'Distributed task execution requires careful consideration of idempotency, exponential backoff, and circuit breakers.',
      hashtags: ['#Engineering', '#TypeScript'],
      mediaUrls: [],
      characterCount: 160,
    };

    const validation = await adapter.validateContent(content);
    expect(validation.valid).toBe(true);

    const result = await adapter.publish(content, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.platform).toBe('linkedin');
  });

  it('should execute dry-run publishing on YouTube adapter', async () => {
    const adapter = getPlatformAdapter('youtube');
    const content: PlatformContent = {
      platform: 'youtube',
      title: 'How to Prevent Duplicate Jobs in Distributed Schedulers',
      text: 'A practical walkthrough of database-backed distributed locks and idempotency keys.',
      hashtags: ['#SystemDesign', '#Coding'],
      mediaUrls: ['https://storage.mock.dev/video.mp4'],
      characterCount: 100,
      videoScript: {
        hook: 'Ever wondered why background jobs duplicate during network outages?',
        scenes: [],
        callToAction: 'Subscribe for deep dives',
        estimatedDurationSeconds: 45,
      },
    };

    const validation = await adapter.validateContent(content);
    expect(validation.valid).toBe(true);

    const result = await adapter.publish(content, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.platform).toBe('youtube');
  });
});
