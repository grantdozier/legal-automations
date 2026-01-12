// Production-grade deposition transcript parser
// Handles multiple transcript formats with robust text extraction

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import type { Document, Page, Utterance } from '../types';
import { formatCitation } from '../utils/citations';

// Configure PDF.js worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ===== TEXT FILE PARSING =====

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

// ===== PDF TEXT EXTRACTION =====

async function parsePdfWithPdfjs(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract text items with better spacing
      const items = textContent.items as any[];
      const lines: string[] = [];
      let currentLine = '';
      let lastY = 0;

      for (const item of items) {
        if (item.str) {
          // Detect new line by Y position change
          if (lastY !== 0 && Math.abs(item.transform[5] - lastY) > 5) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = item.str;
          } else {
            // Same line, add space if needed
            if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
              currentLine += ' ';
            }
            currentLine += item.str;
          }
          lastY = item.transform[5];
        }
      }

      // Don't forget last line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const pageText = lines.join('\n');
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

  try {
    const result = await parsePdfWithPdfjs(arrayBuffer);
    console.log(`✓ PDF.js: Successfully extracted text from ${result.pageCount} pages`);

    if (result.text.trim().length < 100) {
      console.warn('PDF text extraction returned very little text - may be scanned image');
    }

    return result;
  } catch (pdfjsError: any) {
    console.warn('PDF.js failed:', pdfjsError.message);

    try {
      const validation = await validatePdfWithPdfLib(arrayBuffer);
      console.log(`✓ pdf-lib: PDF is valid with ${validation.pageCount} pages, but text extraction failed`);

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

// ===== DOCUMENT CREATION =====

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

// ===== TRANSCRIPT FORMAT DETECTION =====

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

    // Detect page markers: "--- Page 12 ---" or "Page 12" or "[Page 12]"
    const pageMatch = line.match(/^(?:---\s*|\[\s*)?Page\s+(\d+)(?:\s*---|\s*\])?/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      charOffset += line.length + 1;
      continue;
    }

    // Detect line numbers in multiple formats:
    // Format 1: "  1  Q. Question text"
    // Format 2: "  1  A. Answer text"
    // Format 3: "1. Q. Question text" (with period after number)
    const lineNumberMatch = line.match(/^\s*(\d+)\.?\s+(Q\.|A\.|Q:|A:)/i);
    let lineNumber: number | undefined;
    let cleanText = line.trim();

    if (lineNumberMatch) {
      lineNumber = parseInt(lineNumberMatch[1], 10);
      // Remove line number and Q./A. prefix from text
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

// ===== ROBUST UTTERANCE EXTRACTION =====

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
    // Check for Q&A markers - multiple formats:
    // 1. "Q. Question text" or "Q: Question text"
    // 2. "A. Answer text" or "A: Answer text"
    // 3. "QUESTION: text" or "ANSWER: text"
    // 4. "MR./MS./THE [NAME]:" (attorney questions or witness answers)

    const qMatch = line.text.match(/^Q[.:]?\s*/i);
    const aMatch = line.text.match(/^A[.:]?\s*/i);
    const questionMatch = line.text.match(/^QUESTION[.:]?\s*/i);
    const answerMatch = line.text.match(/^ANSWER[.:]?\s*/i);

    // Check for speaker format: "MR. SMITH:", "MS. JONES:", "THE WITNESS:"
    const speakerMatch = line.text.match(/^(MR\.|MS\.|THE|DR\.)\s+([A-Z]+)[.:]?\s*/i);

    if (qMatch || questionMatch) {
      // Save previous utterance if exists
      if (currentUtterance.role && currentUtterance.lines.length > 0) {
        utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
      }

      // Start new question
      const match = qMatch || questionMatch!;
      currentUtterance = {
        role: 'QUESTION',
        lines: [{ ...line, text: line.text.substring(match[0].length).trim() }],
        startLine: line.lineNumber,
      };
    } else if (aMatch || answerMatch) {
      // Save previous utterance if exists
      if (currentUtterance.role && currentUtterance.lines.length > 0) {
        utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
      }

      // Start new answer
      const match = aMatch || answerMatch!;
      currentUtterance = {
        role: 'ANSWER',
        lines: [{ ...line, text: line.text.substring(match[0].length).trim() }],
        startLine: line.lineNumber,
      };
    } else if (speakerMatch) {
      // Speaker format - need to determine if it's a question or answer
      // Heuristic: "THE WITNESS" or witness name = ANSWER, others = QUESTION
      const speakerType = speakerMatch[1].toUpperCase();
      const speakerName = speakerMatch[2].toUpperCase();

      const isWitness = speakerType === 'THE' ||
                       speakerName === 'WITNESS' ||
                       (currentUtterance.role === 'QUESTION'); // If last was question, this is likely answer

      // Save previous utterance if exists
      if (currentUtterance.role && currentUtterance.lines.length > 0) {
        utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
      }

      currentUtterance = {
        role: isWitness ? 'ANSWER' : 'QUESTION',
        lines: [{ ...line, text: line.text.substring(speakerMatch[0].length).trim() }],
        startLine: line.lineNumber,
      };
    } else if (currentUtterance.role) {
      // Continue current utterance (multi-line response)
      // But skip headers and metadata lines
      if (!isHeaderLine(line.text)) {
        currentUtterance.lines.push(line);
      }
    }
  }

  // Don't forget the last utterance
  if (currentUtterance.role && currentUtterance.lines.length > 0) {
    utterances.push(createUtterance(document.id, currentUtterance as { role: 'QUESTION' | 'ANSWER'; lines: ParsedLine[]; startLine?: number }));
  }

  return utterances;
}

function isHeaderLine(text: string): boolean {
  // Skip common header/metadata patterns
  const headerPatterns = [
    /^DEPOSITION OF/i,
    /^Case No\./i,
    /^Date:/i,
    /^EXAMINATION BY/i,
    /^CROSS-EXAMINATION BY/i,
    /^REDIRECT EXAMINATION BY/i,
    /^RECROSS-EXAMINATION BY/i,
    /^STIPULATIONS/i,
    /^EXHIBITS/i,
    /^WHEREUPON/i,
    /^\(.*\)$/,  // (Parenthetical notes)
    /^---+$/,    // Divider lines
  ];

  return headerPatterns.some(pattern => pattern.test(text));
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
  const text = utterance.lines
    .map(l => l.text)
    .filter(t => t.length > 0)
    .join(' ')
    .trim();

  // Generate citation
  const citation = formatCitation({
    page: pageNumber,
    lineStart,
    lineEnd: lineEnd !== lineStart ? lineEnd : undefined,
    charStart: lineStart === undefined ? firstLine.charOffset : undefined,
  });

  // Determine speaker
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

// ===== PAGE EXTRACTION =====

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
