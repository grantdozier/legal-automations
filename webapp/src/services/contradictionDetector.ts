// Contradiction detection service - Production grade with local vector search

import { v4 as uuidv4 } from 'uuid';
import type { Claim, Contradiction, ContradictionType } from '../types';
import { detectContradiction } from './openai';
import { buildContradictionPrompt } from '../prompts';
import { findSimilarVectors } from '../utils/vectorSearch';

export interface DetectionProgress {
  current: number;
  total: number;
  pairsAnalyzed: number;
  contradictionsFound: number;
}

export type ProgressCallback = (progress: DetectionProgress) => void;

export interface CandidatePair {
  claimA: Claim;
  claimB: Claim;
  similarity: number;
  reason: 'semantic' | 'entity' | 'topic' | 'temporal';
}

export interface ClaimWithEmbedding {
  claim: Claim;
  embedding: number[];
}

export async function findContradictions(
  claims: Claim[],
  topK: number = 8,
  similarityThreshold: number = 0.7,
  onProgress?: ProgressCallback,
  embeddings?: number[][]
): Promise<Contradiction[]> {
  const contradictions: Contradiction[] = [];
  let pairsAnalyzed = 0;
  const alreadyCompared = new Set<string>();

  console.log(`Starting contradiction detection: ${claims.length} claims, threshold=${similarityThreshold}`);

  // Create claim-embedding pairs
  const claimsWithEmbeddings: ClaimWithEmbedding[] = embeddings
    ? claims.map((claim, i) => ({ claim, embedding: embeddings[i] }))
    : [];

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: claims.length,
        pairsAnalyzed,
        contradictionsFound: contradictions.length,
      });
    }

    try {
      // Generate candidates for this claim
      const candidates = generateCandidates(
        claim,
        claims,
        claimsWithEmbeddings,
        topK,
        similarityThreshold
      );

      if (i < 3) { // Log first 3 for debugging
        console.log(`Claim ${i + 1}: "${claim.normalizedText.substring(0, 80)}..." - ${candidates.length} candidates found`);
      }

      // Analyze each candidate pair
      for (const candidate of candidates) {
        const pairKey = getPairKey(candidate.claimA.id, candidate.claimB.id);

        // Skip if already compared
        if (alreadyCompared.has(pairKey)) {
          continue;
        }
        alreadyCompared.add(pairKey);

        pairsAnalyzed++;

        // Detect contradiction
        const contradiction = await detectContradictionInPair(
          candidate.claimA,
          candidate.claimB
        );

        if (contradiction) {
          contradictions.push(contradiction);
          console.log(`✓ Found contradiction: ${contradiction.type} (confidence: ${contradiction.confidence.toFixed(2)})`);
        }

        // Small delay to avoid rate limiting
        await sleep(300);
      }
    } catch (error) {
      console.error(`Failed to process claim ${claim.id}:`, error);
      // Continue with next claim
    }
  }

  if (onProgress) {
    onProgress({
      current: claims.length,
      total: claims.length,
      pairsAnalyzed,
      contradictionsFound: contradictions.length,
    });
  }

  console.log(`Contradiction detection complete: ${contradictions.length} contradictions from ${pairsAnalyzed} pairs`);

  return contradictions;
}

function generateCandidates(
  claim: Claim,
  allClaims: Claim[],
  claimsWithEmbeddings: ClaimWithEmbedding[],
  topK: number,
  similarityThreshold: number
): CandidatePair[] {
  const candidates: CandidatePair[] = [];
  const seenIds = new Set<string>([claim.id]);

  // CRITICAL: Skip claims from the same utterance (they can't contradict each other)
  const sameUtteranceIds = new Set(
    allClaims.filter(c => c.utteranceId === claim.utteranceId).map(c => c.id)
  );

  try {
    // 1. Semantic similarity (using local vector search if embeddings available)
    if (claimsWithEmbeddings.length > 0) {
      const currentClaimEmbedding = claimsWithEmbeddings.find(ce => ce.claim.id === claim.id);

      if (currentClaimEmbedding) {
        // Get all other embeddings
        const otherClaims = claimsWithEmbeddings.filter(
          ce => ce.claim.id !== claim.id && !sameUtteranceIds.has(ce.claim.id)
        );

        const otherEmbeddings = otherClaims.map(ce => ce.embedding);

        // Find similar vectors
        const similarResults = findSimilarVectors(
          currentClaimEmbedding.embedding,
          otherEmbeddings,
          topK * 2,
          similarityThreshold
        );

        for (const result of similarResults) {
          const claimB = otherClaims[result.index].claim;

          if (seenIds.has(claimB.id)) continue;
          if (sameUtteranceIds.has(claimB.id)) continue; // Double-check

          candidates.push({
            claimA: claim,
            claimB,
            similarity: result.similarity,
            reason: 'semantic',
          });
          seenIds.add(claimB.id);
        }
      }
    }
  } catch (error) {
    console.warn('Semantic search failed, falling back to lexical matching:', error);
  }

  // 2. Same entity mentions (but different utterances)
  for (const claimB of allClaims) {
    if (seenIds.has(claimB.id)) continue;
    if (sameUtteranceIds.has(claimB.id)) continue; // Skip same utterance

    const sharedEntities = claim.entities.filter(e =>
      claimB.entities.some(e2 => e2.toLowerCase() === e.toLowerCase())
    );

    if (sharedEntities.length > 0) {
      candidates.push({
        claimA: claim,
        claimB,
        similarity: 0.8,
        reason: 'entity',
      });
      seenIds.add(claimB.id);
    }
  }

  // 3. Same topic (but different utterances)
  for (const claimB of allClaims) {
    if (seenIds.has(claimB.id)) continue;
    if (sameUtteranceIds.has(claimB.id)) continue; // Skip same utterance

    const sharedTopics = claim.topics.filter(t =>
      claimB.topics.includes(t)
    );

    if (sharedTopics.length > 0) {
      candidates.push({
        claimA: claim,
        claimB,
        similarity: 0.7,
        reason: 'topic',
      });
      seenIds.add(claimB.id);
    }
  }

  // 4. Temporal overlap (if both have time scopes, different utterances)
  if (claim.timeScope) {
    for (const claimB of allClaims) {
      if (seenIds.has(claimB.id)) continue;
      if (sameUtteranceIds.has(claimB.id)) continue; // Skip same utterance

      if (claimB.timeScope && hasTemporalOverlap(claim.timeScope, claimB.timeScope)) {
        candidates.push({
          claimA: claim,
          claimB,
          similarity: 0.75,
          reason: 'temporal',
        });
        seenIds.add(claimB.id);
      }
    }
  }

  // Sort by similarity and return top K
  return candidates
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export async function detectContradictionInPair(
  claimA: Claim,
  claimB: Claim
): Promise<Contradiction | null> {
  // CRITICAL: Never compare a claim to itself
  if (claimA.id === claimB.id) {
    console.warn('Attempted to compare claim to itself:', claimA.id);
    return null;
  }

  // CRITICAL: Never compare claims from the same utterance
  if (claimA.utteranceId === claimB.utteranceId) {
    console.warn('Attempted to compare claims from same utterance:', claimA.utteranceId);
    return null;
  }

  console.log('Comparing claims:');
  console.log('  A:', claimA.normalizedText.substring(0, 100), '...', claimA.citation);
  console.log('  B:', claimB.normalizedText.substring(0, 100), '...', claimB.citation);

  // Build prompt
  const prompt = buildContradictionPrompt(
    {
      text: claimA.normalizedText,
      citation: claimA.citation,
      polarity: claimA.polarity,
      modality: claimA.modality,
      timeScope: claimA.timeScope,
      topics: claimA.topics,
    },
    {
      text: claimB.normalizedText,
      citation: claimB.citation,
      polarity: claimB.polarity,
      modality: claimB.modality,
      timeScope: claimB.timeScope,
      topics: claimB.topics,
    }
  );

  // Call LLM
  const judgment = await detectContradiction(prompt);

  console.log('  LLM judgment:', judgment.label, 'confidence:', judgment.confidence);

  // If consistent, return null
  if (judgment.label === 'CONSISTENT') {
    return null;
  }

  // Create contradiction record
  return {
    id: uuidv4(),
    claimA,
    claimB,
    type: judgment.label as ContradictionType,
    explanation: judgment.explanation,
    confidence: judgment.confidence,
    createdAt: new Date(),
  };
}

export function groupContradictionsByType(
  contradictions: Contradiction[]
): Map<ContradictionType, Contradiction[]> {
  const groups = new Map<ContradictionType, Contradiction[]>();

  for (const contradiction of contradictions) {
    if (!groups.has(contradiction.type)) {
      groups.set(contradiction.type, []);
    }
    groups.get(contradiction.type)!.push(contradiction);
  }

  return groups;
}

export function groupContradictionsByTopic(
  contradictions: Contradiction[]
): Map<string, Contradiction[]> {
  const groups = new Map<string, Contradiction[]>();

  for (const contradiction of contradictions) {
    const topics = new Set([
      ...contradiction.claimA.topics,
      ...contradiction.claimB.topics,
    ]);

    for (const topic of topics) {
      if (!groups.has(topic)) {
        groups.set(topic, []);
      }
      groups.get(topic)!.push(contradiction);
    }

    if (topics.size === 0) {
      if (!groups.has('uncategorized')) {
        groups.set('uncategorized', []);
      }
      groups.get('uncategorized')!.push(contradiction);
    }
  }

  return groups;
}

export function filterContradictionsByConfidence(
  contradictions: Contradiction[],
  minConfidence: number
): Contradiction[] {
  return contradictions.filter(c => c.confidence >= minConfidence);
}

export function sortContradictionsByConfidence(
  contradictions: Contradiction[],
  descending: boolean = true
): Contradiction[] {
  return [...contradictions].sort((a, b) =>
    descending ? b.confidence - a.confidence : a.confidence - b.confidence
  );
}

export function getContradictionStatistics(contradictions: Contradiction[]): {
  total: number;
  byType: Record<string, number>;
  avgConfidence: number;
  highConfidence: number; // >= 0.8
  mediumConfidence: number; // 0.5-0.79
  lowConfidence: number; // < 0.5
} {
  const byType: Record<string, number> = {
    HARD_CONTRADICTION: 0,
    SOFT_INCONSISTENCY: 0,
    SCOPE_SHIFT: 0,
    TEMPORAL_CONFLICT: 0,
    DEFINITION_DRIFT: 0,
  };

  let totalConfidence = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  for (const contradiction of contradictions) {
    byType[contradiction.type]++;
    totalConfidence += contradiction.confidence;

    if (contradiction.confidence >= 0.8) {
      highConfidence++;
    } else if (contradiction.confidence >= 0.5) {
      mediumConfidence++;
    } else {
      lowConfidence++;
    }
  }

  return {
    total: contradictions.length,
    byType,
    avgConfidence: contradictions.length > 0 ? totalConfidence / contradictions.length : 0,
    highConfidence,
    mediumConfidence,
    lowConfidence,
  };
}

function getPairKey(idA: string, idB: string): string {
  // Ensure consistent ordering
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

function hasTemporalOverlap(scopeA: string, scopeB: string): boolean {
  // Simple heuristic: check if scopes mention similar years or time periods
  const yearsA: string[] = scopeA.match(/\d{4}/g) || [];
  const yearsB: string[] = scopeB.match(/\d{4}/g) || [];

  for (const yearA of yearsA) {
    if (yearsB.includes(yearA)) {
      return true;
    }
  }

  // Could be enhanced with more sophisticated temporal parsing
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
