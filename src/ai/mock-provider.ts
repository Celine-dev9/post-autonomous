import { z } from 'zod';
import { GenerateOptions, IAIProvider } from './ai-provider.js';
import { createBaselineVector } from './gemini-provider.js';

export class MockAIProvider implements IAIProvider {
  public readonly name = 'mock';

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    if (prompt.includes('topic') || prompt.includes('research') || prompt.includes('ideation') || prompt.includes('content idea')) {
      return JSON.stringify({
        topics: [
          {
            topic: 'Designing Resilient Multi-Agent Workflows in Production',
            angle: 'Fault-tolerant message queues and distributed state reconciliation',
            pillarId: 'educational-tips',
            reasoning: 'Developers struggle with non-deterministic agent loop failures.',
            relevanceScore: 94,
            freshnessScore: 90,
          },
          {
            topic: 'Production Vector Search: HNSW vs IVFFlat Benchmarks',
            angle: 'Memory footprint, index rebuild overhead, and recall trade-offs',
            pillarId: 'educational-tips',
            reasoning: 'Engineering teams often misconfigure indexing in production vector databases.',
            relevanceScore: 92,
            freshnessScore: 91,
          },
          {
            topic: 'Why Synchronous LLM Calls Break Distributed Pipelines',
            angle: 'How to build async durable streaming queues for AI workflows',
            pillarId: 'practical-tutorials',
            reasoning: 'Common anti-pattern in developer agent codebases.',
            relevanceScore: 95,
            freshnessScore: 89,
          },
        ],
      });
    }

    if (prompt.includes('Quality') || prompt.includes('QA') || prompt.includes('fact check')) {
      return JSON.stringify({
        score: 92,
        passed: true,
        issues: [],
        factualConcerns: [],
        brandConcerns: [],
        duplicateConcerns: [],
        platformConcerns: [],
        recommendedCorrections: [],
      });
    }

    return 'Mock generated technical content for autonomous publishing system.';
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    // If prompt is for MasterContent
    if (prompt.includes('Master Content') || prompt.includes('master content') || prompt.includes('takeaway')) {
      const mockMaster = {
        topic: 'Designing Resilient Multi-Agent Workflows in Production',
        topicRationale: 'High technical demand for reliable autonomous software agents.',
        sourceReferences: ['https://example.com/multi-agent-reliability'],
        contentPillar: 'educational-tips',
        contentAngle: 'Fault-tolerant message queues and distributed state reconciliation',
        audience: 'Senior Software Engineers & Cloud Architects',
        mainTakeaway: 'Always decouple agent execution steps with durable event logs.',
        hook: 'Most autonomous agent pipelines fail because they treat LLM calls like synchronous functions.',
        body: 'In production, model latency spikes, rate limits, and transient errors are inevitable. By introducing an event-driven queue with deterministic idempotency keys, you isolate agent steps and prevent cascading failures across your infrastructure.',
        cta: 'Save this post for your next architecture review.',
        supportingFacts: [
          'Idempotency prevents duplicate side-effects on network retries.',
          'Event streaming provides auditability for long-running workflows.',
        ],
        mediaConcept: 'Architectural flowchart showing event queue decoupling agent worker steps',
        imagePrompt: 'A crisp, high-contrast system architecture diagram of distributed agent queues, dark mode, technical blueprint style',
        videoConcept: {
          title: 'How to Build Unbreakable Multi-Agent Systems',
          hook: 'Why do most autonomous agent prototypes fail the moment they hit production traffic?',
          scenes: [
            {
              sceneNumber: 1,
              narration: 'Most engineers build agents with nested while-loops. Here is why that crashes.',
              visualPrompt: 'Code editor showing brittle while-loop throwing uncaught rate limit exceptions',
            },
            {
              sceneNumber: 2,
              narration: 'The solution is distributed event queues with persistent idempotency keys.',
              visualPrompt: 'Animated diagram of events flowing through Redis and PostgreSQL worker queue',
            },
          ],
          tags: ['AI Agents', 'System Design', 'LLMOps', 'Software Engineering'],
          description: 'A deep-dive architectural blueprint on designing fault-tolerant multi-agent systems in production.',
        },
        suggestedHashtags: ['#SystemDesign', '#LLMOps', '#SoftwareArchitecture', '#AI'],
        keywords: ['multi-agent', 'idempotency', 'distributed systems', 'LLMOps'],
        seoKeywords: ['autonomous agent architecture', 'multi-agent systems production'],
      };

      const result = schema.safeParse(mockMaster);
      if (result.success) return result.data;
    }

    // If prompt is for Quality Assessment
    if (prompt.includes('Quality') || prompt.includes('quality') || prompt.includes('fact check')) {
      const mockQA = {
        score: 92,
        passed: true,
        issues: [],
        factualConcerns: [],
        brandConcerns: [],
        duplicateConcerns: [],
        platformConcerns: [],
        recommendedCorrections: [],
      };
      const result = schema.safeParse(mockQA);
      if (result.success) return result.data;
    }

    // If prompt is for Platform Adaptation
    if (prompt.includes('platform') || prompt.includes('adapt') || prompt.includes('Platform')) {
      const mockPlatform = {
        platform: 'x',
        text: 'Most autonomous agent pipelines fail because they treat LLM calls like synchronous functions.\n\nIn production, network blips and rate limits are guaranteed. Decouple steps with durable queues and idempotency keys to ensure resilience.\n\n#SystemDesign #LLMOps',
        hashtags: ['#SystemDesign', '#LLMOps'],
        mediaUrls: [],
        characterCount: 220,
      };
      const result = schema.safeParse(mockPlatform);
      if (result.success) return result.data;
    }

    // Default fallback
    const raw = await this.generateText(prompt, options);
    return JSON.parse(raw) as T;
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    return createBaselineVector(text);
  }
}
