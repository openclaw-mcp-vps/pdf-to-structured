export type PdfNodeType = "section" | "paragraph" | "list" | "table";

export interface PdfTable {
  type: "table";
  title?: string;
  headers: string[];
  rows: string[][];
  page?: number;
}

export interface PdfParagraph {
  type: "paragraph";
  text: string;
  page?: number;
}

export interface PdfList {
  type: "list";
  ordered: boolean;
  items: string[];
  page?: number;
}

export type PdfContentNode = PdfSection | PdfParagraph | PdfList | PdfTable;

export interface PdfSection {
  type: "section";
  heading: string;
  level: number;
  page?: number;
  children: PdfContentNode[];
}

export interface StructuredPdfMetadata {
  sourceType: "upload" | "url";
  sourceName: string;
  pageCount: number;
  model: string;
  generatedAt: string;
}

export interface StructuredPdfResult {
  metadata: StructuredPdfMetadata;
  sections: PdfSection[];
  tables: PdfTable[];
}

export interface ProcessedPdfResponse {
  result: StructuredPdfResult;
  pricing: {
    pricePerPage: number;
    pages: number;
    estimatedCost: number;
  };
}
