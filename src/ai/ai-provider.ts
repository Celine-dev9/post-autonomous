import { z } from 'zod';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

export interface IAIProvider {
  name: string;

  generateText(prompt: string, options?: GenerateOptions): Promise<string>;

  generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>;

  generateEmbeddings(text: string): Promise<number[]>;
}
