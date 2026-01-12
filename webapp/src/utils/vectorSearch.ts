// Local vector similarity search (replaces Chroma Cloud for browser deployment)
// Uses cosine similarity for semantic matching

export interface VectorSearchResult {
  index: number;
  similarity: number;
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Find most similar vectors to a query vector
export function findSimilarVectors(
  queryVector: number[],
  corpus: number[][],
  topK: number = 10,
  minSimilarity: number = 0.0
): VectorSearchResult[] {
  const similarities: VectorSearchResult[] = [];

  for (let i = 0; i < corpus.length; i++) {
    const similarity = cosineSimilarity(queryVector, corpus[i]);

    if (similarity >= minSimilarity) {
      similarities.push({ index: i, similarity });
    }
  }

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top K results
  return similarities.slice(0, topK);
}

// Batch search: find similar vectors for multiple queries
export function batchFindSimilarVectors(
  queryVectors: number[][],
  corpus: number[][],
  topK: number = 10,
  minSimilarity: number = 0.0
): VectorSearchResult[][] {
  return queryVectors.map(query =>
    findSimilarVectors(query, corpus, topK, minSimilarity)
  );
}

// Calculate pairwise similarities between all vectors
export function calculatePairwiseSimilarities(
  vectors: number[][],
  minSimilarity: number = 0.0
): Array<{ indexA: number; indexB: number; similarity: number }> {
  const results: Array<{ indexA: number; indexB: number; similarity: number }> = [];

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const similarity = cosineSimilarity(vectors[i], vectors[j]);

      if (similarity >= minSimilarity) {
        results.push({ indexA: i, indexB: j, similarity });
      }
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}
