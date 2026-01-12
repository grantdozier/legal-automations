// Claim extraction service using LLM

import { v4 as uuidv4 } from 'uuid';
import type { Utterance, Claim, ClaimExtraction } from '../types';
import { extractClaimsFromTestimony } from './openai';
import { buildClaimExtractionPrompt } from '../prompts';

export interface ExtractionProgress {
  current: number;
  total: number;
  currentUtterance?: string;
}

export type ProgressCallback = (progress: ExtractionProgress) => void;

export async function extractClaimsFromUtterances(
  utterances: Utterance[],
  onProgress?: ProgressCallback
): Promise<Claim[]> {
  const allClaims: Claim[] = [];

  // Only extract from ANSWER utterances (witnesses' responses)
  const answerUtterances = utterances.filter(u => u.role === 'ANSWER');

  for (let i = 0; i < answerUtterances.length; i++) {
    const utterance = answerUtterances[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: answerUtterances.length,
        currentUtterance: utterance.text.substring(0, 100) + '...',
      });
    }

    try {
      const claims = await extractClaimsFromUtterance(utterance);
      allClaims.push(...claims);
    } catch (error) {
      console.error(`Failed to extract claims from utterance ${utterance.id}:`, error);
      // Continue with next utterance instead of failing entirely
    }

    // Small delay to avoid rate limiting
    await sleep(500);
  }

  return allClaims;
}

export async function extractClaimsFromUtterance(utterance: Utterance): Promise<Claim[]> {
  // Build the prompt
  const prompt = buildClaimExtractionPrompt(utterance.text);

  // Call LLM
  const extractions = await extractClaimsFromTestimony(prompt);

  // Convert to Claim objects
  const claims: Claim[] = extractions.map((extraction: ClaimExtraction) => ({
    id: uuidv4(),
    utteranceId: utterance.id,
    documentId: utterance.documentId,
    normalizedText: extraction.normalized_text,
    polarity: extraction.polarity,
    modality: extraction.modality,
    timeScope: extraction.time_scope,
    entities: extraction.entities || [],
    topics: extraction.topics || [],
    citation: utterance.citation,
    createdAt: new Date(),
  }));

  return claims;
}

export async function extractClaimsFromUtteranceBatch(
  utterances: Utterance[],
  batchSize: number = 5,
  onProgress?: ProgressCallback
): Promise<Claim[]> {
  const allClaims: Claim[] = [];
  const answerUtterances = utterances.filter(u => u.role === 'ANSWER');

  // Process in batches
  for (let i = 0; i < answerUtterances.length; i += batchSize) {
    const batch = answerUtterances.slice(i, i + batchSize);

    // Process batch in parallel
    const batchPromises = batch.map(utterance =>
      extractClaimsFromUtterance(utterance).catch(error => {
        console.error(`Failed to extract claims from utterance ${utterance.id}:`, error);
        return [] as Claim[];
      })
    );

    const batchResults = await Promise.all(batchPromises);

    for (const claims of batchResults) {
      allClaims.push(...claims);
    }

    if (onProgress) {
      onProgress({
        current: Math.min(i + batchSize, answerUtterances.length),
        total: answerUtterances.length,
      });
    }

    // Delay between batches to respect rate limits
    if (i + batchSize < answerUtterances.length) {
      await sleep(2000);
    }
  }

  return allClaims;
}

export function groupClaimsByTopic(claims: Claim[]): Map<string, Claim[]> {
  const groups = new Map<string, Claim[]>();

  for (const claim of claims) {
    for (const topic of claim.topics) {
      if (!groups.has(topic)) {
        groups.set(topic, []);
      }
      groups.get(topic)!.push(claim);
    }

    // If no topics, add to "uncategorized"
    if (claim.topics.length === 0) {
      if (!groups.has('uncategorized')) {
        groups.set('uncategorized', []);
      }
      groups.get('uncategorized')!.push(claim);
    }
  }

  return groups;
}

export function groupClaimsByEntity(claims: Claim[]): Map<string, Claim[]> {
  const groups = new Map<string, Claim[]>();

  for (const claim of claims) {
    for (const entity of claim.entities) {
      const normalized = entity.toLowerCase().trim();
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)!.push(claim);
    }
  }

  return groups;
}

export function filterClaimsByModality(
  claims: Claim[],
  modalities: Array<'certain' | 'uncertain' | 'dont_recall'>
): Claim[] {
  return claims.filter(c => modalities.includes(c.modality));
}

export function filterClaimsByPolarity(
  claims: Claim[],
  polarities: Array<'affirm' | 'deny' | 'unknown'>
): Claim[] {
  return claims.filter(c => polarities.includes(c.polarity));
}

export function getClaimStatistics(claims: Claim[]): {
  total: number;
  byModality: Record<string, number>;
  byPolarity: Record<string, number>;
  topTopics: Array<{ topic: string; count: number }>;
  topEntities: Array<{ entity: string; count: number }>;
} {
  const byModality: Record<string, number> = {
    certain: 0,
    uncertain: 0,
    dont_recall: 0,
  };

  const byPolarity: Record<string, number> = {
    affirm: 0,
    deny: 0,
    unknown: 0,
  };

  const topicCounts = new Map<string, number>();
  const entityCounts = new Map<string, number>();

  for (const claim of claims) {
    byModality[claim.modality]++;
    byPolarity[claim.polarity]++;

    for (const topic of claim.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }

    for (const entity of claim.entities) {
      const normalized = entity.toLowerCase().trim();
      entityCounts.set(normalized, (entityCounts.get(normalized) || 0) + 1);
    }
  }

  const topTopics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topEntities = Array.from(entityCounts.entries())
    .map(([entity, count]) => ({ entity, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: claims.length,
    byModality,
    byPolarity,
    topTopics,
    topEntities,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
