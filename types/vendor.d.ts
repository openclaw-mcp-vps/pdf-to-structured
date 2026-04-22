declare module "react-json-view" {
  import * as React from "react";

  const ReactJson: React.ComponentType<Record<string, unknown>>;
  export default ReactJson;
}

declare module "pdf-parse" {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
    text: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>;

  export default pdfParse;
}
