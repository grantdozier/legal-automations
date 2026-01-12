// Chroma Cloud client service for vector storage and retrieval
// NOTE: Browser-only version - uses local storage instead of Chroma Cloud
// For production with Chroma Cloud, use a backend service

import type { Claim } from '../types';

// Browser storage key
const EMBEDDINGS_KEY = 'depo-forensics-embeddings';

export interface ChromaConfig {
  tenant: string;
  database: string;
  apiKey: string;
}

interface StoredEmbedding {
  claimId: string;
  embedding: number[];
  metadata: {
    claimId: string;
    documentId: string;
    utteranceId: string;
    citation: string;
    polarity: string;
    modality: string;
    timeScope: string;
    entities: string;
    topics: string;
  };
  document: string;
}

export function initializeChroma(_config: ChromaConfig): void {
  // In browser mode, Chroma is disabled
  console.log('Chroma Cloud integration disabled in browser mode. Using local similarity matching.');
}

export function isChromaInitialized(): boolean {
  return false; // Always false in browser mode
}

export async function ensureCollection(): Promise<void> {
  // No-op in browser mode
}

export interface ClaimWithEmbedding {
  claim: Claim;
  embedding: number[];
}

export async function addClaims(claimsWithEmbeddings: ClaimWithEmbedding[]): Promise<void> {
  // Store embeddings in browser localStorage
  try {
    const stored: StoredEmbedding[] = loadStoredEmbeddings();

    for (const { claim, embedding } of claimsWithEmbeddings) {
      stored.push({
        claimId: claim.id,
        embedding,
        metadata: {
          claimId: claim.id,
          documentId: claim.documentId,
          utteranceId: claim.utteranceId,
          citation: claim.citation,
          polarity: claim.polarity,
          modality: claim.modality,
          timeScope: claim.timeScope || '',
          entities: JSON.stringify(claim.entities),
          topics: JSON.stringify(claim.topics),
        },
        document: claim.normalizedText,
      });
    }

    localStorage.setItem(EMBEDDINGS_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error('Failed to store embeddings:', error);
  }
}

export interface SimilarClaim {
  claimId: string;
  distance: number;
  metadata: {
    claimId: string;
    documentId: string;
    utteranceId: string;
    citation: string;
    polarity: string;
    modality: string;
    timeScope: string;
    entities: string;
    topics: string;
  };
  document: string;
}

export async function findSimilarClaims(
  embedding: number[],
  topK: number = 10,
  filters?: {
    documentId?: string;
    topics?: string[];
    entities?: string[];
  }
): Promise<SimilarClaim[]> {
  // Use local cosine similarity
  const stored = loadStoredEmbeddings();

  // Filter by documentId if specified
  let filtered = stored;
  if (filters?.documentId) {
    filtered = stored.filter(s => s.metadata.documentId === filters.documentId);
  }

  // Calculate cosine similarity for each
  const results: Array<{ stored: StoredEmbedding; distance: number }> = [];

  for (const item of filtered) {
    const distance = 1 - cosineSimilarity(embedding, item.embedding);
    results.push({ stored: item, distance });
  }

  // Sort by distance (ascending = most similar first)
  results.sort((a, b) => a.distance - b.distance);

  // Take top K
  const topResults = results.slice(0, topK);

  // Apply additional filters
  let similarClaims: SimilarClaim[] = topResults.map(r => ({
    claimId: r.stored.claimId,
    distance: r.distance,
    metadata: r.stored.metadata,
    document: r.stored.document,
  }));

  if (filters?.topics && filters.topics.length > 0) {
    similarClaims = similarClaims.filter(sc => {
      try {
        const topics = JSON.parse(sc.metadata.topics);
        return filters.topics!.some(t => topics.includes(t));
      } catch {
        return false;
      }
    });
  }

  if (filters?.entities && filters.entities.length > 0) {
    similarClaims = similarClaims.filter(sc => {
      try {
        const entities = JSON.parse(sc.metadata.entities);
        return filters.entities!.some(e => entities.includes(e));
      } catch {
        return false;
      }
    });
  }

  return similarClaims;
}

export async function deleteClaim(claimId: string): Promise<void> {
  const stored = loadStoredEmbeddings();
  const filtered = stored.filter(s => s.claimId !== claimId);
  localStorage.setItem(EMBEDDINGS_KEY, JSON.stringify(filtered));
}

export async function deleteClaimsByDocument(documentId: string): Promise<void> {
  const stored = loadStoredEmbeddings();
  const filtered = stored.filter(s => s.metadata.documentId !== documentId);
  localStorage.setItem(EMBEDDINGS_KEY, JSON.stringify(filtered));
}

export async function clearCollection(): Promise<void> {
  localStorage.removeItem(EMBEDDINGS_KEY);
}

// Helper functions

function loadStoredEmbeddings(): StoredEmbedding[] {
  try {
    const data = localStorage.getItem(EMBEDDINGS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load embeddings:', error);
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}
