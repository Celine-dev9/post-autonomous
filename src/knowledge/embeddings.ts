import { getAIProvider } from '../ai/ai-factory.js';
import { createBaselineVector } from '../ai/gemini-provider.js';

/**
 * Computes cosine similarity between two numerical vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates similarity between two text strings using baseline token hashing.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  const vecA = createBaselineVector(textA);
  const vecB = createBaselineVector(textB);
  return cosineSimilarity(vecA, vecB);
}

/**
 * Generates an embedding vector using the active AI provider.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getAIProvider();
  return ai.generateEmbeddings(text);
}
