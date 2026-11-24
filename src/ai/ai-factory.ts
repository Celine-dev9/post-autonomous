import { getEnv } from '../config/env.js';
import { IAIProvider } from './ai-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { MockAIProvider } from './mock-provider.js';
import { logger } from '../core/logger/index.js';

let aiProviderInstance: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (aiProviderInstance) return aiProviderInstance;

  const env = getEnv();

  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    try {
      aiProviderInstance = new GeminiProvider({
        apiKey: env.GEMINI_API_KEY,
        model: env.AI_MODEL,
        temperature: env.AI_TEMPERATURE,
        maxRetries: env.AI_MAX_RETRIES,
      });
      logger.info('Initialized Gemini AI Provider', { model: env.AI_MODEL });
      return aiProviderInstance;
    } catch (err) {
      logger.warn('Failed to initialize Gemini Provider, falling back to Mock Provider', {
        error: String(err),
      });
    }
  }

  logger.info('Using Mock AI Provider (Safe development / test mode)');
  aiProviderInstance = new MockAIProvider();
  return aiProviderInstance;
}

export function setAIProvider(provider: IAIProvider): void {
  aiProviderInstance = provider;
}
