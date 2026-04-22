"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ReactJson = dynamic(() => import("react-json-view"), {
  ssr: false
});

interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <Card className="glass border-[#2f3744]">
      <CardHeader>
        <CardTitle>Structured JSON Output</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[560px] overflow-auto rounded-md border border-[#2f3744] bg-[#0d1117] p-4">
          <ReactJson
            src={(data as Record<string, unknown>) || {}}
            theme="monokai"
            collapsed={2}
            displayDataTypes={false}
            enableClipboard
            name={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
