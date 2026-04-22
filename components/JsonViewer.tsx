"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PdfStructuredResponse } from "@/types/pdf-response";

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

type JsonViewerProps = {
  data: PdfStructuredResponse | null;
};

export function JsonViewer({ data }: JsonViewerProps): JSX.Element {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Structured JSON Output</CardTitle>
          <CardDescription>
            Process a document to view nested sections and table arrays. Output is ready for downstream ETL pipelines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
            Waiting for your first extraction.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Structured JSON Output</CardTitle>
        <CardDescription>
          {data.documentTitle} • {data.pageCount} page{data.pageCount === 1 ? "" : "s"} • ${data.estimatedCostUsd.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-slate-500">Sections</div>
            <div className="mt-1 text-base font-semibold text-slate-100">{data.sections.length}</div>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-slate-500">Tables</div>
            <div className="mt-1 text-base font-semibold text-slate-100">{data.tables.length}</div>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-slate-500">Model</div>
            <div className="mt-1 text-base font-semibold text-slate-100">{data.model.name}</div>
          </div>
        </div>

        <div className="max-h-[560px] overflow-auto rounded-lg border border-slate-800 bg-[#010409] p-3">
          <ReactJson
            src={data}
            name={false}
            theme="ashes"
            collapsed={2}
            enableClipboard={true}
            displayDataTypes={false}
            displayObjectSize={true}
            collapseStringsAfterLength={180}
            style={{ backgroundColor: "#010409", fontSize: "0.83rem", padding: "0.5rem" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
