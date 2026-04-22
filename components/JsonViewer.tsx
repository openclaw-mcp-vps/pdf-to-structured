"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { JsonView, darkStyles, allExpanded } from "react-json-view-lite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

  async function copyPayload() {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Structured JSON</CardTitle>
        <Button variant="secondary" size="sm" onClick={copyPayload} className="mono">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-[560px] overflow-auto rounded-lg border border-[var(--border)] bg-[#0a101b] p-3">
          <JsonView
            data={data as Record<string, unknown>}
            shouldExpandNode={allExpanded}
            style={darkStyles}
            clickToExpandNode
          />
        </div>
      </CardContent>
    </Card>
  );
}
