import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/ai/mock-provider.js';
import { MasterContentSchema, buildMasterContentPrompt } from '../../src/ai/prompts/generation-prompt.js';
import { QualityAssessmentSchema, buildQualityAuditPrompt } from '../../src/ai/prompts/quality-prompt.js';
import { AdaptedContentSchema, buildAdaptationPrompt } from '../../src/ai/prompts/adaptation-prompt.js';
import { cosineSimilarity, calculateTextSimilarity } from '../../src/knowledge/embeddings.js';
import { createBaselineVector } from '../../src/ai/gemini-provider.js';
import { KnowledgeRetriever } from '../../src/knowledge/retrieval.js';
import { loadBrandKnowledge } from '../../src/config/brand.js';

describe('Phase 3: AI & Knowledge Base', () => {
  const mockAI = new MockAIProvider();
  const brandKnowledge = loadBrandKnowledge();

  it('should generate valid MasterContent conforming to Zod schema', async () => {
    const prompt = 'Generate master content for multi-agent workflows';
    const result = await mockAI.generateStructured(prompt, MasterContentSchema);

    expect(result).toBeDefined();
    expect(result.topic).toContain('Multi-Agent');
    expect(result.hook.length).toBeGreaterThan(10);
    expect(result.body.length).toBeGreaterThan(50);
    expect(result.suggestedHashtags.length).toBeGreaterThan(0);
    expect(result.videoConcept).toBeDefined();
    expect(result.videoConcept?.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate valid QualityAssessment conforming to Zod schema', async () => {
    const prompt = 'Quality assessment QA fact check';
    const result = await mockAI.generateStructured(prompt, QualityAssessmentSchema);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.passed).toBe(true);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should generate valid platform-specific adapted content', async () => {
    const prompt = 'Adapt platform content for x';
    const result = await mockAI.generateStructured(prompt, AdaptedContentSchema);

    expect(result).toBeDefined();
    expect(result.platform).toBe('x');
    expect(result.text.length).toBeGreaterThan(10);
    expect(result.hashtags.length).toBeGreaterThan(0);
  });

  it('should accurately calculate cosine similarity and text similarity', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);

    // Text similarity
    const simHigh = calculateTextSimilarity(
      'Autonomous agent event queues and idempotency',
      'Autonomous agent event queues and idempotency keys'
    );
    const simLow = calculateTextSimilarity(
      'Autonomous agent event queues and idempotency',
      'Making homemade pasta and sourdough pizza'
    );

    expect(simHigh).toBeGreaterThan(0.5);
    expect(simLow).toBeLessThan(0.3);
  });

  it('should retrieve context for topic from KnowledgeRetriever', async () => {
    const retriever = new KnowledgeRetriever();
    const context = await retriever.getContextForTopic(
      'Building Resilient Agent Loops',
      'educational-tips'
    );

    expect(context.brandKnowledge).toBeDefined();
    expect(context.brandKnowledge.brand).toContain('AutoMedia Labs');
    expect(Array.isArray(context.recentTopics)).toBe(true);
  });
});
