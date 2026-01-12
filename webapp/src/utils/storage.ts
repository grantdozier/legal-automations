// Browser local storage utilities for persisting application data

import type { StoredData, Document, Utterance, Claim, Contradiction, ApiConfig } from '../types';

const STORAGE_KEY = 'depo-forensics-data';
const CONFIG_KEY = 'depo-forensics-config';

// Initialize empty storage structure
const emptyStorage: StoredData = {
  documents: [],
  utterances: [],
  claims: [],
  contradictions: [],
  config: {},
};

export function loadFromStorage(): StoredData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return emptyStorage;

    const parsed = JSON.parse(data);

    // Convert date strings back to Date objects
    if (parsed.documents) {
      parsed.documents = parsed.documents.map((doc: any) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt),
      }));
    }

    if (parsed.claims) {
      parsed.claims = parsed.claims.map((claim: any) => ({
        ...claim,
        createdAt: new Date(claim.createdAt),
      }));
    }

    if (parsed.contradictions) {
      parsed.contradictions = parsed.contradictions.map((contradiction: any) => ({
        ...contradiction,
        createdAt: new Date(contradiction.createdAt),
        claimA: {
          ...contradiction.claimA,
          createdAt: new Date(contradiction.claimA.createdAt),
        },
        claimB: {
          ...contradiction.claimB,
          createdAt: new Date(contradiction.claimB.createdAt),
        },
      }));
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return emptyStorage;
  }
}

export function saveToStorage(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
    throw new Error('Storage quota exceeded or storage unavailable');
  }
}

export function loadConfig(): ApiConfig {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load config:', error);
    return {};
  }
}

export function saveConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CONFIG_KEY);
}

// Specific entity operations
export function saveDocument(document: Document): void {
  const data = loadFromStorage();
  const existingIndex = data.documents.findIndex(d => d.id === document.id);

  if (existingIndex >= 0) {
    data.documents[existingIndex] = document;
  } else {
    data.documents.push(document);
  }

  saveToStorage(data);
}

export function saveUtterances(utterances: Utterance[]): void {
  const data = loadFromStorage();
  data.utterances.push(...utterances);
  saveToStorage(data);
}

export function saveClaims(claims: Claim[]): void {
  const data = loadFromStorage();
  data.claims.push(...claims);
  saveToStorage(data);
}

export function saveContradictions(contradictions: Contradiction[]): void {
  const data = loadFromStorage();
  data.contradictions.push(...contradictions);
  saveToStorage(data);
}

export function getDocumentById(id: string): Document | undefined {
  const data = loadFromStorage();
  return data.documents.find(d => d.id === id);
}

export function getUtterancesByDocumentId(documentId: string): Utterance[] {
  const data = loadFromStorage();
  return data.utterances.filter(u => u.documentId === documentId);
}

export function getClaimsByDocumentId(documentId: string): Claim[] {
  const data = loadFromStorage();
  return data.claims.filter(c => c.documentId === documentId);
}

export function getContradictionsByDocumentId(documentId: string): Contradiction[] {
  const data = loadFromStorage();
  return data.contradictions.filter(c =>
    c.claimA.documentId === documentId || c.claimB.documentId === documentId
  );
}

export function deleteDocument(id: string): void {
  const data = loadFromStorage();
  data.documents = data.documents.filter(d => d.id !== id);
  data.utterances = data.utterances.filter(u => u.documentId !== id);
  data.claims = data.claims.filter(c => c.documentId !== id);
  data.contradictions = data.contradictions.filter(c =>
    c.claimA.documentId !== id && c.claimB.documentId !== id
  );
  saveToStorage(data);
}

export function exportData(): string {
  const data = loadFromStorage();
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): void {
  try {
    const data = JSON.parse(jsonString);
    saveToStorage(data);
  } catch (error) {
    console.error('Failed to import data:', error);
    throw new Error('Invalid data format');
  }
}
