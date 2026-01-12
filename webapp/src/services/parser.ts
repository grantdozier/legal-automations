// Deposition transcript parser service

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import type { Document, Page, Utterance } from '../types';
import { formatCitation } from '../utils/citations';

// Configure PDF.js worker - use bundled worker for production
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

// Primary PDF parser using PDF.js with robust configuration
async function parsePdfWithPdfjs(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0, // Suppress warnings
  });

  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          // Handle different text item formats
          if (typeof item === 'string') return item;
          return item.str || '';
        })
        .filter(Boolean)
        .join(' ');

      pageTexts.push(`\n--- Page ${i} ---\n${pageText}`);
    } catch (pageError) {
      console.warn(`Error parsing page ${i}:`, pageError);
      pageTexts.push(`\n--- Page ${i} ---\n[Error extracting text from this page]`);
    }
  }

  return {
    text: pageTexts.join('\n'),
    pageCount: pdf.numPages,
  };
}

// Fallback: validate PDF structure with pdf-lib
async function validatePdfWithPdfLib(arrayBuffer: ArrayBuffer): Promise<{ pageCount: number }> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  return { pageCount: pdfDoc.getPageCount() };
}

export async function parsePdfFile(file: File): Promise<{ text: string; pageCount: number }> {
  console.log(`Parsing PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  const arrayBuffer = await file.arrayBuffer();

  // Try PDF.js (best for text extraction)
  try {
    const result = await parsePdfWithPdfjs(arrayBuffer);
    console.log(`✓ PDF.js: Successfully extracted text from ${result.pageCount} pages`);
    return result;
  } catch (pdfjsError: any) {
    console.warn('PDF.js failed:', pdfjsError.message);

    // Validate PDF structure with pdf-lib
    try {
      const validation = await validatePdfWithPdfLib(arrayBuffer);
      console.log(`✓ pdf-lib: PDF is valid with ${validation.pageCount} pages, but text extraction failed`);

      // Return a message for user
      const errorText = `
--- PDF Validation Results ---
The PDF file is structurally valid with ${validation.pageCount} pages, but text extraction failed.

Possible reasons:
- PDF contains scanned images without OCR text
- PDF uses unsupported text encoding
- PDF is password protected or encrypted

Recommended solutions:
1. Export the PDF to plain text format (.txt)
2. Use OCR software to extract text from scanned documents
3. Copy/paste text directly from the PDF into a .txt file

Original error: ${pdfjsError.message}
      `.trim();

      return {
        text: errorText,
        pageCount: validation.pageCount,
      };
    } catch (pdfLibError: any) {
      console.error('pdf-lib validation also failed:', pdfLibError.message);
      throw new Error(
        `Unable to parse PDF file. The file may be corrupted, encrypted, or in an unsupported format. ` +
        `Please try converting to .txt format. Error: ${pdfjsError.message}`
      );
    }
  }
}

export async function createDocumentFromFile(file: File): Promise<Document> {
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  const sourceType = isPdf ? 'pdf' : 'txt';

  let rawText: string;
  let pageCount: number | undefined;

  if (isPdf) {
    const result = await parsePdfFile(file);
    rawText = result.text;
    pageCount = result.pageCount;
  } else {
    rawText = await parseTextFile(file);
  }

  return {
    id: uuidv4(),
    title: file.name.replace(/\.(pdf|txt)$/i, ''),
    sourceType,
    uploadedAt: new Date(),
    rawText,
    pageCount,
  };
}

interface ParsedLine {
  pageNumber: number;
  lineNumber?: number;
  text: string;
  charOffset: number;
}

export function parseIntoLines(text: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let currentPage = 1;
  let charOffset = 0;

  const textLines = text.split('\n');

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];

    // Detect page markers like "--- Page 12 ---" or "Page 12"
    const pageMatch = line.match(/^(?:---\s*)?Page\s+(\d+)/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      charOffset += line.length + 1;
      continue;
    }

    // Detect line numbers (common in depositions)
    // Format: "  1  Q. Question text"
    // Format: "  1  A. Answer text"
    const lineNumberMatch = line.match(/^\s*(\d+)\s+(Q\.|A\.)/);
    let lineNumber: number | undefined;
    let cleanText = line.trim();

    if (lineNumberMatch) {
      lineNumber = parseInt(lineNumberMatch[1], 10);
      cleanText = line.substring(lineNumberMatch.index! + lineNumberMatch[0].length).trim();
    }

    if (cleanText.length > 0) {
      lines.push({
        pageNumber: currentPage,
        lineNumber,
        text: cleanText,
        charOffset,
      });
    }

    charOffset += line.length + 1;
  }

  return lines;
}

export function extractUtterances(document: Document): Utterance[] {
  const lines = parseIntoLines(document.rawText);
  const utterances: Utterance[] = [];

  let currentUtterance: {
    role: 'QUESTION' | 'ANSWER' | null;
    lines: ParsedLine[];
    startLine?: number;
  } = {
    role: null,
    lines: [],
  };

  for (const line of lines) {
    // Check if this line starts a question or answer
    const qMatch = line.text.match(/^Q\.\s*/);
    const aMatch = line.text.match(/^A\.\s*/);

    if (qMatch) {
      // Save previous utterance if exists
      if (currentUtterance.role && currentUtterance.lines.length > 0) {
        utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
      }

      // Start new question
      currentUtterance = {
        role: 'QUESTION',
        lines: [{ ...line, text: line.text.substring(qMatch[0].length).trim() }],
        startLine: line.lineNumber,
      };
    } else if (aMatch) {
      // Save previous utterance if exists
      if (currentUtterance.role && currentUtterance.lines.length > 0) {
        utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
      }

      // Start new answer
      currentUtterance = {
        role: 'ANSWER',
        lines: [{ ...line, text: line.text.substring(aMatch[0].length).trim() }],
        startLine: line.lineNumber,
      };
    } else if (currentUtterance.role) {
      // Continue current utterance
      currentUtterance.lines.push(line);
    }
  }

  // Don't forget the last utterance
  if (currentUtterance.role && currentUtterance.lines.length > 0) {
    utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
  }

  return utterances;
}

function createUtterance(
  documentId: string,
  utterance: {
    role: 'QUESTION' | 'ANSWER';
    lines: ParsedLine[];
    startLine?: number;
  }
): Utterance {
  const firstLine = utterance.lines[0];
  const lastLine = utterance.lines[utterance.lines.length - 1];

  const pageNumber = firstLine.pageNumber;
  const lineStart = firstLine.lineNumber;
  const lineEnd = lastLine.lineNumber;

  // Combine all line texts
  const text = utterance.lines.map(l => l.text).join(' ').trim();

  // Generate citation
  const citation = formatCitation({
    page: pageNumber,
    lineStart,
    lineEnd: lineEnd !== lineStart ? lineEnd : undefined,
    charStart: lineStart === undefined ? firstLine.charOffset : undefined,
  });

  // Determine speaker (for now, generic)
  const speaker = utterance.role === 'QUESTION' ? 'Attorney' : 'Witness';

  return {
    id: uuidv4(),
    documentId,
    pageNumber,
    lineStart,
    lineEnd,
    speaker,
    role: utterance.role,
    text,
    citation,
    timestamp: new Date(),
  };
}

export function extractPages(document: Document): Page[] {
  const pages: Page[] = [];
  const lines = parseIntoLines(document.rawText);

  // Group lines by page
  const pageMap = new Map<number, ParsedLine[]>();

  for (const line of lines) {
    if (!pageMap.has(line.pageNumber)) {
      pageMap.set(line.pageNumber, []);
    }
    pageMap.get(line.pageNumber)!.push(line);
  }

  // Create page objects
  for (const [pageNumber, pageLines] of pageMap.entries()) {
    pages.push({
      id: uuidv4(),
      documentId: document.id,
      pageNumber,
      text: pageLines.map(l => l.text).join('\n'),
      lineCount: pageLines.filter(l => l.lineNumber !== undefined).length,
    });
  }

  return pages.sort((a, b) => a.pageNumber - b.pageNumber);
}
