"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const formatted = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const onCopy = async () => {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card className="border-slate-700/70">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">Structured JSON Output</CardTitle>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[540px] overflow-auto rounded-xl border border-slate-800 bg-black/50 p-4 text-xs leading-relaxed text-slate-200">
          {formatted}
        </pre>
      </CardContent>
    </Card>
  );
}
