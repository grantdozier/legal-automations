// Core data types for the legal deposition analysis system

export interface Document {
  id: string;
  title: string;
  sourceType: 'pdf' | 'txt';
  uploadedAt: Date;
  rawText: string;
  pageCount?: number;
}

export interface Page {
  id: string;
  documentId: string;
  pageNumber: number;
  text: string;
  lineCount?: number;
}

export interface Utterance {
  id: string;
  documentId: string;
  pageNumber: number;
  lineStart?: number;
  lineEnd?: number;
  speaker: string;
  role: 'QUESTION' | 'ANSWER';
  text: string;
  citation: string; // e.g., "Page 12, Lines 5-8"
  timestamp?: Date;
}

export type Polarity = 'affirm' | 'deny' | 'unknown';
export type Modality = 'certain' | 'uncertain' | 'dont_recall';

export interface Claim {
  id: string;
  utteranceId: string;
  documentId: string;
  normalizedText: string;
  polarity: Polarity;
  modality: Modality;
  timeScope?: string; // e.g., "2020-2021", "at that time"
  entities: string[]; // Names, systems, documents, events
  topics: string[]; // duty, confidentiality, disclosure, etc.
  citation: string;
  embeddingId?: string;
  createdAt: Date;
}

export type ContradictionType =
  | 'HARD_CONTRADICTION'
  | 'SOFT_INCONSISTENCY'
  | 'SCOPE_SHIFT'
  | 'TEMPORAL_CONFLICT'
  | 'DEFINITION_DRIFT';

export interface Contradiction {
  id: string;
  claimA: Claim;
  claimB: Claim;
  type: ContradictionType;
  explanation: string;
  confidence: number; // 0-1
  createdAt: Date;
}

export interface ClaimExtraction {
  normalized_text: string;
  polarity: Polarity;
  modality: Modality;
  time_scope?: string;
  entities: string[];
  topics: string[];
}

export interface ContradictionJudgment {
  label: 'CONSISTENT' | ContradictionType;
  explanation: string;
  confidence: number;
}

// Configuration types
export interface ApiConfig {
  openaiApiKey?: string;
  chromaTenant?: string;
  chromaApiKey?: string;
  chromaDatabase?: string;
}

// Report types
export interface ContradictionReportEntry {
  issue: string;
  claimA: {
    text: string;
    citation: string;
  };
  claimB: {
    text: string;
    citation: string;
  };
  type: ContradictionType;
  explanation: string;
  confidence: number;
}

export interface Report {
  documentId: string;
  documentTitle: string;
  generatedAt: Date;
  summary: string;
  contradictions: ContradictionReportEntry[];
  timeline?: TimelineEntry[];
  statistics: {
    totalClaims: number;
    totalContradictions: number;
    hardContradictions: number;
    softInconsistencies: number;
  };
}

export interface TimelineEntry {
  date: string;
  event: string;
  claims: string[];
  citations: string[];
}

// Processing status types
export interface ProcessingStatus {
  stage: 'idle' | 'parsing' | 'extracting' | 'embedding' | 'analyzing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

// Storage types (for local browser storage)
export interface StoredData {
  documents: Document[];
  utterances: Utterance[];
  claims: Claim[];
  contradictions: Contradiction[];
  config: ApiConfig;
}
