// OpenAI API client service

import OpenAI from 'openai';
import type { ClaimExtraction, ContradictionJudgment } from '../types';

let openaiClient: OpenAI | null = null;

export function initializeOpenAI(apiKey: string): void {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  openaiClient = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
}

export function isOpenAIInitialized(): boolean {
  return openaiClient !== null;
}

export async function generateChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
  } = {}
): Promise<string> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Please configure your API key.');
  }

  const {
    temperature = 0.3, // Low temperature for consistency
    maxTokens = 2000,
    responseFormat = 'text',
  } = options;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o', // Using GPT-4 for better accuracy
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat === 'json' && { response_format: { type: 'json_object' } }),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return content;
  } catch (error: any) {
    if (error?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    }
    if (error?.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }
    if (error?.status === 500 || error?.status === 503) {
      throw new Error('OpenAI service is currently unavailable. Please try again later.');
    }

    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error?.message || 'Unknown error'}`);
  }
}

export async function extractClaimsFromTestimony(
  prompt: string
): Promise<ClaimExtraction[]> {
  const response = await generateChatCompletion(
    [
      {
        role: 'system',
        content: 'You are a legal assistant that extracts structured claims from testimony. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.3,
      maxTokens: 3000,
      responseFormat: 'json',
    }
  );

  try {
    // Try to parse the response as JSON
    const parsed = JSON.parse(response);

    // Handle both array and object with claims array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.claims && Array.isArray(parsed.claims)) {
      return parsed.claims;
    }

    throw new Error('Response is not in expected format');
  } catch (error) {
    console.error('Failed to parse claims extraction response:', error);
    console.error('Response was:', response);
    throw new Error('Failed to parse claims from LLM response');
  }
}

export async function detectContradiction(
  prompt: string
): Promise<ContradictionJudgment> {
  const response = await generateChatCompletion(
    [
      {
        role: 'system',
        content: 'You are a legal assistant that compares claims to identify contradictions. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.2,
      maxTokens: 1000,
      responseFormat: 'json',
    }
  );

  try {
    const parsed = JSON.parse(response);

    if (!parsed.label || !parsed.explanation || parsed.confidence === undefined) {
      throw new Error('Response missing required fields');
    }

    return {
      label: parsed.label,
      explanation: parsed.explanation,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error('Failed to parse contradiction judgment response:', error);
    console.error('Response was:', response);
    throw new Error('Failed to parse contradiction judgment from LLM response');
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Please configure your API key.');
  }

  const cleanText = (text || '').trim();

  if (cleanText.length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-large',
      input: cleanText,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('OpenAI embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error?.message || 'Unknown error'}`);
  }
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Please configure your API key.');
  }

  // Filter out empty or invalid texts
  const validTexts = texts
    .map(text => (text || '').trim())
    .filter(text => text.length > 0);

  if (validTexts.length === 0) {
    throw new Error('No valid texts provided for embedding generation');
  }

  if (validTexts.length !== texts.length) {
    console.warn(`Filtered out ${texts.length - validTexts.length} empty/invalid texts`);
  }

  // OpenAI has a limit of 2048 texts per batch - split if necessary
  const MAX_BATCH_SIZE = 2048;
  const batches: string[][] = [];

  for (let i = 0; i < validTexts.length; i += MAX_BATCH_SIZE) {
    batches.push(validTexts.slice(i, i + MAX_BATCH_SIZE));
  }

  try {
    const allEmbeddings: number[][] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Generating embeddings for batch ${batchIndex + 1}/${batches.length} (${batch.length} texts)`);

      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-large',
        input: batch,
      });

      allEmbeddings.push(...response.data.map(item => item.embedding));

      // Add small delay between batches to avoid rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allEmbeddings;
  } catch (error: any) {
    console.error('OpenAI batch embedding error:', error);
    throw new Error(`Failed to generate embeddings: ${error?.message || 'Unknown error'}`);
  }
}
