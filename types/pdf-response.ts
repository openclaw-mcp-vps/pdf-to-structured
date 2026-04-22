export interface PdfList {
  ordered: boolean;
  items: string[];
}

export interface PdfTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  page?: number;
}

export interface PdfSection {
  id: string;
  title: string;
  level: number;
  paragraphs: string[];
  lists: PdfList[];
  tables: PdfTable[];
  children: PdfSection[];
}

export interface PdfModelInfo {
  provider: string;
  name: string;
  usedVision: boolean;
  fallback: boolean;
}

export interface PdfStructuredResponse {
  documentTitle: string;
  source: string;
  pageCount: number;
  estimatedCostUsd: number;
  processedAt: string;
  sections: PdfSection[];
  tables: PdfTable[];
  warnings: string[];
  model: PdfModelInfo;
}
