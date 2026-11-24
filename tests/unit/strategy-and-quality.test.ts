import { describe, it, expect, beforeEach } from 'vitest';
import { HashtagGenerator } from '../../src/content/hashtag-generator.js';
import { ContentValidator } from '../../src/content/content-validator.js';
import { DuplicateDetector } from '../../src/content/duplicate-detector.js';
import { PillarSelector } from '../../src/strategy/pillar-selector.js';
import { PlatformContent } from '../../src/core/types/index.js';

describe('Phase 5: Content Strategy, Adaptation & Quality', () => {
  let hashtagGen: HashtagGenerator;
  let validator: ContentValidator;
  let duplicateDetector: DuplicateDetector;
  let pillarSelector: PillarSelector;

  beforeEach(() => {
    hashtagGen = new HashtagGenerator();
    validator = new ContentValidator();
    duplicateDetector = new DuplicateDetector();
    pillarSelector = new PillarSelector();
  });

  it('should generate platform-compliant hashtags without spam tags', () => {
    const keywords = ['AI agents', 'architecture', 'viral', 'fyp', 'distributed systems'];
    const topic = 'Building Resilient Microservices in TypeScript';

    const xTags = hashtagGen.generateForPlatform(keywords, topic, 'x');
    expect(xTags.length).toBeLessThanOrEqual(3);
    expect(xTags.every((t) => !t.toLowerCase().includes('viral'))).toBe(true);
    expect(xTags.every((t) => t.startsWith('#'))).toBe(true);

    const igTags = hashtagGen.generateForPlatform(keywords, topic, 'instagram');
    expect(igTags.length).toBeLessThanOrEqual(10);
    expect(igTags.length).toBeGreaterThanOrEqual(2);
  });

  it('should validate platform character and hashtag limits accurately', () => {
    const validXPost: PlatformContent = {
      platform: 'x',
      text: 'Autonomous agents require deterministic state transitions and robust idempotency keys.',
      hashtags: ['#AI', '#SystemDesign'],
      mediaUrls: [],
      characterCount: 105,
    };

    const validResult = validator.validatePlatformContent(validXPost);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors.length).toBe(0);

    const oversizedXPost: PlatformContent = {
      platform: 'x',
      text: 'A'.repeat(300),
      hashtags: ['#tag1', '#tag2', '#tag3', '#tag4', '#tag5'],
      mediaUrls: [],
      characterCount: 350,
    };

    const invalidResult = validator.validatePlatformContent(oversizedXPost);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.some((e) => e.includes('character limit'))).toBe(true);
    expect(invalidResult.errors.some((e) => e.includes('Too many hashtags'))).toBe(true);
  });

  it('should detect exact and normalized text duplicates', () => {
    const textA = 'Mastering Event-Driven Architecture in 2026!';
    const textB = 'mastering event driven architecture in 2026';
    expect(duplicateDetector.exactDuplicate(textA, textB)).toBe(true);

    const textC = 'Completely different topic on database sharding';
    expect(duplicateDetector.exactDuplicate(textA, textC)).toBe(false);
  });

  it('should select next content pillar with balance rotation', async () => {
    const selectedPillar = await pillarSelector.selectNextPillar();
    expect(selectedPillar).toBeDefined();
    expect(selectedPillar.id).toBeDefined();
    expect(selectedPillar.targetPercentage).toBeGreaterThan(0);
  });
});
