// Chroma Cloud client service for vector storage and retrieval

import { CloudClient } from 'chromadb';
import { config } from '../config';
import type { Claim } from '../types';

let chromaClient: CloudClient | null = null;
const collectionName = 'deposition_claims';

export function initializeChroma(): void {
  try {
    chromaClient = new CloudClient({
      apiKey: config.chroma.apiKey,
      tenant: config.chroma.tenant,
      database: config.chroma.database,
    });
    console.log('Chroma Cloud initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Chroma client:', error);
    throw new Error('Failed to initialize Chroma Cloud client');
  }
}

export function isChromaInitialized(): boolean {
  return chromaClient !== null;
}

export async function ensureCollection(): Promise<void> {
  if (!chromaClient) {
    throw new Error('Chroma client not initialized');
  }

  try {
    // Try to get existing collection
    await chromaClient.getCollection({
      name: collectionName,
    });
  } catch (error) {
    // Collection doesn't exist, create it
    try {
      await chromaClient.createCollection({
        name: collectionName,
        metadata: {
          description: 'Deposition claims with embeddings for semantic search',
        },
      });
    } catch (createError) {
      console.error('Failed to create collection:', createError);
      throw new Error('Failed to create Chroma collection');
    }
  }
}

export interface ClaimWithEmbedding {
  claim: Claim;
  embedding: number[];
}

export async function addClaims(claimsWithEmbeddings: ClaimWithEmbedding[]): Promise<void> {
  if (!chromaClient) {
    throw new Error('Chroma client not initialized');
  }

  if (claimsWithEmbeddings.length === 0) {
    return;
  }

  try {
    await ensureCollection();

    const collection = await chromaClient.getCollection({
      name: collectionName,
    });

    const ids = claimsWithEmbeddings.map(c => c.claim.id);
    const embeddings = claimsWithEmbeddings.map(c => c.embedding);
    const metadatas = claimsWithEmbeddings.map(c => ({
      claimId: c.claim.id,
      documentId: c.claim.documentId,
      utteranceId: c.claim.utteranceId,
      citation: c.claim.citation,
      polarity: c.claim.polarity,
      modality: c.claim.modality,
      timeScope: c.claim.timeScope || '',
      entities: JSON.stringify(c.claim.entities),
      topics: JSON.stringify(c.claim.topics),
    }));
    const documents = claimsWithEmbeddings.map(c => c.claim.normalizedText);

    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents,
    });
  } catch (error) {
    console.error('Failed to add claims to Chroma:', error);
    throw new Error('Failed to store claims in vector database');
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
  if (!chromaClient) {
    throw new Error('Chroma client not initialized');
  }

  try {
    await ensureCollection();

    const collection = await chromaClient.getCollection({
      name: collectionName,
    });

    // Build where clause for filtering
    let where: any = undefined;
    if (filters?.documentId) {
      where = { documentId: filters.documentId };
    }

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
      ...(where && { where }),
    });

    if (!results.ids || !results.ids[0] || results.ids[0].length === 0) {
      return [];
    }

    const similarClaims: SimilarClaim[] = [];

    for (let i = 0; i < results.ids[0].length; i++) {
      const claimId = results.ids[0][i];
      const distance = results.distances?.[0]?.[i] ?? 1;
      const metadata = results.metadatas?.[0]?.[i] as any;
      const document = results.documents?.[0]?.[i] ?? '';

      similarClaims.push({
        claimId,
        distance,
        metadata,
        document,
      });
    }

    // Apply additional filters if needed
    let filteredClaims = similarClaims;

    if (filters?.topics && filters.topics.length > 0) {
      filteredClaims = filteredClaims.filter(sc => {
        try {
          const topics = JSON.parse(sc.metadata.topics);
          return filters.topics!.some(t => topics.includes(t));
        } catch {
          return false;
        }
      });
    }

    if (filters?.entities && filters.entities.length > 0) {
      filteredClaims = filteredClaims.filter(sc => {
        try {
          const entities = JSON.parse(sc.metadata.entities);
          return filters.entities!.some(e => entities.includes(e));
        } catch {
          return false;
        }
      });
    }

    return filteredClaims;
  } catch (error) {
    console.error('Failed to query Chroma:', error);
    throw new Error('Failed to search vector database');
  }
}

export async function deleteClaim(claimId: string): Promise<void> {
  if (!chromaClient) {
    throw new Error('Chroma client not initialized');
  }

  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
    });

    await collection.delete({
      ids: [claimId],
    });
  } catch (error) {
    console.error('Failed to delete claim from Chroma:', error);
  }
}

export async function deleteClaimsByDocument(documentId: string): Promise<void> {
  if (!chromaClient) {
    throw new Error('Chroma client not initialized');
  }

  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
    });

    await collection.delete({
      where: { documentId },
    });
  } catch (error) {
    console.error('Failed to delete claims from Chroma:', error);
  }
}

export async function clearCollection(): Promise<void> {
  if (!chromaClient) {
    throw new Error('Chroma client not initialized');
  }

  try {
    await chromaClient.deleteCollection({
      name: collectionName,
    });

    // Recreate empty collection
    await ensureCollection();
  } catch (error) {
    console.error('Failed to clear collection:', error);
    throw new Error('Failed to clear vector database');
  }
}
