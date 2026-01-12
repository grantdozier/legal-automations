// Utilities for handling deposition citations

export interface CitationAnchor {
  page: number;
  lineStart?: number;
  lineEnd?: number;
  charStart?: number;
  charEnd?: number;
}

export function formatCitation(anchor: CitationAnchor): string {
  if (anchor.lineStart !== undefined) {
    if (anchor.lineEnd !== undefined && anchor.lineEnd !== anchor.lineStart) {
      return `Page ${anchor.page}, Lines ${anchor.lineStart}-${anchor.lineEnd}`;
    }
    return `Page ${anchor.page}, Line ${anchor.lineStart}`;
  }

  if (anchor.charStart !== undefined) {
    return `Page ${anchor.page}, Position ${anchor.charStart}`;
  }

  return `Page ${anchor.page}`;
}

export function parseCitation(citation: string): CitationAnchor | null {
  // Parse formats like:
  // "Page 12, Lines 5-8"
  // "Page 12, Line 5"
  // "Page 12"
  // "Page 12, Position 123"

  const pageMatch = citation.match(/Page\s+(\d+)/i);
  if (!pageMatch) return null;

  const page = parseInt(pageMatch[1], 10);
  const anchor: CitationAnchor = { page };

  // Try to parse line range
  const lineRangeMatch = citation.match(/Lines?\s+(\d+)(?:-(\d+))?/i);
  if (lineRangeMatch) {
    anchor.lineStart = parseInt(lineRangeMatch[1], 10);
    if (lineRangeMatch[2]) {
      anchor.lineEnd = parseInt(lineRangeMatch[2], 10);
    }
    return anchor;
  }

  // Try to parse character position
  const posMatch = citation.match(/Position\s+(\d+)/i);
  if (posMatch) {
    anchor.charStart = parseInt(posMatch[1], 10);
  }

  return anchor;
}

export function generateCitationId(anchor: CitationAnchor): string {
  // Generate a unique ID for indexing citations
  const parts = [anchor.page];
  if (anchor.lineStart !== undefined) {
    parts.push(anchor.lineStart);
    if (anchor.lineEnd !== undefined) {
      parts.push(anchor.lineEnd);
    }
  } else if (anchor.charStart !== undefined) {
    parts.push(anchor.charStart);
  }
  return parts.join('-');
}

export function compareCitations(a: CitationAnchor, b: CitationAnchor): number {
  // Compare two citations for sorting
  // Returns: -1 if a < b, 0 if equal, 1 if a > b

  if (a.page !== b.page) {
    return a.page - b.page;
  }

  if (a.lineStart !== undefined && b.lineStart !== undefined) {
    return a.lineStart - b.lineStart;
  }

  if (a.charStart !== undefined && b.charStart !== undefined) {
    return a.charStart - b.charStart;
  }

  return 0;
}
