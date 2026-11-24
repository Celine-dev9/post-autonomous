import { z } from 'zod';
import { MasterContent, Platform, PlatformContent, QualityResult } from '../core/types/index.js';
import { getAIProvider } from '../ai/ai-factory.js';
import { KnowledgeRetriever } from '../knowledge/retrieval.js';
import { MasterContentSchema, buildMasterContentPrompt } from '../ai/prompts/generation-prompt.js';
import { QualityAssessmentSchema, buildQualityAuditPrompt } from '../ai/prompts/quality-prompt.js';
import { AdaptedContentSchema, buildAdaptationPrompt } from '../ai/prompts/adaptation-prompt.js';
import { getPlatformsConfig } from '../config/platform-config.js';
import { getPublishingConfig } from '../config/settings.js';
import { loadBrandKnowledge } from '../config/brand.js';
import { QualityControlError } from '../core/errors/index.js';
import { logger } from '../core/logger/index.js';

export class ContentGenerator {
  private ai = getAIProvider();
  private retriever = new KnowledgeRetriever();

  async generateMasterContent(
    topic: string,
    angle: string,
    pillarId: string,
    sourceUrl?: string
  ): Promise<MasterContent> {
    const context = await this.retriever.getContextForTopic(topic, pillarId);
    const brandKnowledge = loadBrandKnowledge();

    const prompt = buildMasterContentPrompt(topic, angle, pillarId, context, sourceUrl);

    logger.info('Generating master content', { topic, pillarId });

    const content = await this.ai.generateStructured(prompt, MasterContentSchema, {
      systemInstruction: brandKnowledge.systemPrompt,
      temperature: 0.75,
    });

    return content as MasterContent;
  }

  async runQualityCheck(content: MasterContent): Promise<QualityResult> {
    const brandKnowledge = loadBrandKnowledge();
    const config = getPublishingConfig();
    const threshold = config.qualityThreshold;

    const prompt = buildQualityAuditPrompt(content, brandKnowledge, threshold);
    logger.info('Running quality assessment', { topic: content.topic });

    const assessment = await this.ai.generateStructured(prompt, QualityAssessmentSchema);

    return {
      score: assessment.score,
      passed: assessment.passed && assessment.score >= threshold,
      issues: assessment.issues,
      factualConcerns: assessment.factualConcerns,
      brandConcerns: assessment.brandConcerns,
      duplicateConcerns: assessment.duplicateConcerns,
      platformConcerns: assessment.platformConcerns,
      recommendedCorrections: assessment.recommendedCorrections,
    };
  }

  async generateAndQualityCheck(
    topic: string,
    angle: string,
    pillarId: string,
    sourceUrl?: string
  ): Promise<{ content: MasterContent; quality: QualityResult }> {
    const config = getPublishingConfig();
    const maxRetries = config.maxQualityRetries;
    let content!: MasterContent;
    let quality!: QualityResult;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      content = await this.generateMasterContent(topic, angle, pillarId, sourceUrl);
      quality = await this.runQualityCheck(content);

      if (quality.passed) {
        logger.info(`Content passed quality check on attempt ${attempt}`, {
          topic,
          score: quality.score,
        });
        return { content, quality };
      }

      logger.warn(`Quality check failed on attempt ${attempt}/${maxRetries + 1}`, {
        topic,
        score: quality.score,
        issues: quality.issues.slice(0, 3),
      });

      if (attempt > maxRetries) {
        throw new QualityControlError(
          `Content failed quality threshold (${quality.score}/${config.qualityThreshold}) after ${maxRetries + 1} attempts`,
          { topic, quality }
        );
      }
    }

    return { content, quality };
  }

  async adaptForPlatform(content: MasterContent, platform: Platform): Promise<PlatformContent> {
    const platformsConfig = getPlatformsConfig();
    const config = platformsConfig[platform];

    const prompt = buildAdaptationPrompt(content, platform, config);
    logger.info(`Adapting content for ${platform}`, { topic: content.topic });

    const adapted = await this.ai.generateStructured(prompt, AdaptedContentSchema);

    return {
      platform,
      title: adapted.title,
      text: adapted.text,
      hashtags: adapted.hashtags,
      mediaUrls: [],
      characterCount: adapted.text.length + adapted.hashtags.join(' ').length,
      videoScript: adapted.videoScript,
      metadata: {},
    };
  }

  async adaptForAllPlatforms(content: MasterContent, platforms: Platform[]): Promise<Map<Platform, PlatformContent>> {
    const results = new Map<Platform, PlatformContent>();

    for (const platform of platforms) {
      try {
        const adapted = await this.adaptForPlatform(content, platform);
        results.set(platform, adapted);
      } catch (err) {
        logger.warn(`Failed to adapt content for ${platform}`, { error: String(err) });
      }
    }

    return results;
  }
}
