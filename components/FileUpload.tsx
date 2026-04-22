"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PdfStructuredResponse } from "@/types/pdf-response";

type FileUploadProps = {
  onProcessed: (data: PdfStructuredResponse) => void;
};

type InputMode = "file" | "url";

export function FileUpload({ onProcessed }: FileUploadProps): JSX.Element {
  const [mode, setMode] = useState<InputMode>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<PdfStructuredResponse | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const [first] = acceptedFiles;
    if (first) {
      setSelectedFile(first);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"]
    }
  });

  const pageCostCopy = useMemo(() => {
    if (!lastResult) {
      return null;
    }
    return `Processed ${lastResult.pageCount} page${lastResult.pageCount === 1 ? "" : "s"} at $${lastResult.estimatedCostUsd.toFixed(2)}.`;
  }, [lastResult]);

  const submit = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();

      if (mode === "file") {
        if (!selectedFile) {
          throw new Error("Choose a PDF file before processing.");
        }
        formData.append("file", selectedFile);
      } else {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          throw new Error("Paste a PDF URL before processing.");
        }
        formData.append("url", trimmedUrl);
      }

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json().catch(() => ({ error: "Unexpected response from server." }))) as
        | PdfStructuredResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error || "Processing failed." : "Processing failed.");
      }

      if (!("sections" in payload)) {
        throw new Error("Invalid response received from PDF processor.");
      }

      setLastResult(payload);
      onProcessed(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "PDF processing failed.");
    } finally {
      setIsProcessing(false);
    }
  }, [mode, onProcessed, selectedFile, url]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process a PDF</CardTitle>
        <CardDescription>
          Upload a file or paste a URL. The API extracts headings, paragraphs, list items, and table data into nested JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}>
            Upload PDF
          </Button>
          <Button type="button" variant={mode === "url" ? "default" : "outline"} onClick={() => setMode("url")}>
            Paste URL
          </Button>
        </div>

        {mode === "file" ? (
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border border-dashed p-6 text-center transition ${
              isDragActive
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                : "border-slate-700 bg-slate-900/60 text-slate-300"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-sm font-medium">
              {selectedFile ? `Selected: ${selectedFile.name}` : "Drop a PDF file here, or click to browse"}
            </p>
            <p className="mt-2 text-xs text-slate-500">Max file size: 25MB</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-slate-400" htmlFor="pdf-url">
              PDF URL
            </label>
            <Input
              id="pdf-url"
              placeholder="https://example.com/invoice.pdf"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        )}

        <Button type="button" size="lg" className="w-full" onClick={submit} disabled={isProcessing}>
          {isProcessing ? "Extracting structured JSON..." : "Extract Structured JSON"}
        </Button>

        {pageCostCopy ? <p className="text-xs text-emerald-300">{pageCostCopy}</p> : null}
        {error ? <p className="rounded-md border border-rose-800 bg-rose-900/30 p-3 text-sm text-rose-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
