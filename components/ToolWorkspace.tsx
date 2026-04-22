"use client";

import { useState } from "react";

import { FileUpload } from "@/components/FileUpload";
import { JsonViewer } from "@/components/JsonViewer";
import type { PdfStructuredResponse } from "@/types/pdf-response";

export function ToolWorkspace(): JSX.Element {
  const [result, setResult] = useState<PdfStructuredResponse | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <FileUpload onProcessed={setResult} />
      <JsonViewer data={result} />
    </div>
  );
}
