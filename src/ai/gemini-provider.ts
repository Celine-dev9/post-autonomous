import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { GenerateOptions, IAIProvider } from './ai-provider.js';
import { AIProviderError } from '../core/errors/index.js';
import { logger } from '../core/logger/index.js';

export class GeminiProvider implements IAIProvider {
  public readonly name = 'gemini';
  private ai: GoogleGenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private maxRetries: number;

  constructor(options: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxRetries?: number;
  }) {
    if (!options.apiKey) {
      throw new AIProviderError('GEMINI_API_KEY is required to initialize GeminiProvider');
    }
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.defaultModel = options.model || 'gemini-2.5-flash';
    this.defaultTemperature = options.temperature ?? 0.7;
    this.maxRetries = options.maxRetries ?? 3;
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.defaultModel,
          contents: prompt,
          config: {
            temperature: options?.temperature ?? this.defaultTemperature,
            systemInstruction: options?.systemInstruction,
          },
        });

        const text = response.text || '';
        return text;
      } catch (err) {
        lastError = err;
        logger.warn(`Gemini text generation failed on attempt ${attempt}/${this.maxRetries}`, {
          error: String(err),
        });
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw new AIProviderError(`Failed to generate text after ${this.maxRetries} attempts`, lastError);
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    const jsonPrompt = `${prompt}

IMPORTANT: You must respond ONLY with a raw, valid JSON object matching the requested schema.
Do NOT include markdown formatting, backticks (\`\`\`json), or conversational preamble.
Just raw JSON.`;

    let currentPrompt = jsonPrompt;
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const rawResponse = await this.generateText(currentPrompt, options);

        // Strip backticks or formatting if returned
        let cleanJson = rawResponse.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsedJson = JSON.parse(cleanJson);
        const validation = schema.safeParse(parsedJson);

        if (validation.success) {
          return validation.data;
        }

        // Schema validation failed - prepare repair prompt
        logger.warn(`Zod schema validation failed on attempt ${attempt}/${this.maxRetries}`, {
          errors: validation.error.format(),
        });

        currentPrompt = `The previous JSON response did not match the expected schema:
Validation errors: ${JSON.stringify(validation.error.format())}

Previous raw output:
${cleanJson}

Please fix all schema errors and output ONLY the corrected valid JSON object.`;
      } catch (err) {
        lastError = err;
        logger.warn(`JSON parsing failed on attempt ${attempt}/${this.maxRetries}`, {
          error: String(err),
        });
        currentPrompt = `${jsonPrompt}\n\nNOTE: Your previous response was invalid JSON. Ensure strict JSON syntax without escaping errors.`;
      }

      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new AIProviderError(
      `Failed to generate valid structured data after ${this.maxRetries} attempts`,
      lastError
    );
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });

      const res = response as any;
      if (res.embedding?.values) {
        return res.embedding.values;
      }
      if (res.embeddings?.[0]?.values) {
        return res.embeddings[0].values;
      }
    } catch (err) {
      logger.warn('Gemini embedding generation failed, using normalized word vector fallback', {
        error: String(err),
      });
    }

    // Baseline fallback vector generator
    return createBaselineVector(text);
  }
}

/**
 * Creates a normalized 64-dimensional float vector based on text token hashing
 * Allows deterministic semantic/keyword similarity when embedding API is offline.
 */
export function createBaselineVector(text: string, dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1;
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => Number((v / magnitude).toFixed(4)));
}
