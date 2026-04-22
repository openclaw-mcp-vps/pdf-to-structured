"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileJson, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { JsonViewer } from "@/components/JsonViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProcessedPdfResponse } from "@/types/pdf-data";

interface FileUploadProps {
  paymentLink: string;
}

export function FileUpload({ paymentLink }: FileUploadProps) {
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessedPdfResponse | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    async function checkAccess() {
      const response = await fetch("/api/access", { cache: "no-store" });
      const data = (await response.json()) as { hasAccess?: boolean };
      setHasAccess(Boolean(data.hasAccess));
      setCheckedAccess(true);
    }

    checkAccess().catch(() => {
      setCheckedAccess(true);
      setHasAccess(false);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setUnlocking(true);
    setError("");

    fetch("/api/access", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ sessionId })
    })
      .then(async (response) => {
        const data = (await response.json()) as { hasAccess?: boolean; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not unlock access yet.");
        }
        setHasAccess(Boolean(data.hasAccess));
      })
      .catch((unlockError) => {
        const message = unlockError instanceof Error ? unlockError.message : "Unlock failed.";
        setError(message);
      })
      .finally(() => {
        setUnlocking(false);
      });
  }, [sessionId]);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError("");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"]
    },
    multiple: false
  });

  const canProcess = useMemo(() => {
    return Boolean(file || url.trim().length > 0);
  }, [file, url]);

  async function submitPdf() {
    if (!hasAccess) {
      setError("Buy access first to unlock PDF processing.");
      return;
    }

    if (!canProcess) {
      setError("Upload a PDF file or add a PDF URL.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    if (url.trim()) {
      formData.append("url", url.trim());
    }

    try {
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as ProcessedPdfResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "PDF processing failed.");
      }

      setResult(data);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass border-[#2f3744]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-[#3fb950]" />
            PDF to Structured JSON
          </CardTitle>
          <CardDescription>
            Upload a PDF or paste a public URL. Output includes hierarchical sections, paragraphs,
            lists, and machine-friendly table arrays.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!checkedAccess ? (
            <div className="rounded-md border border-[#2f3744] bg-[#111822] p-3 text-sm text-[#94a3b8]">
              Checking access status...
            </div>
          ) : null}

          {!hasAccess && checkedAccess ? (
            <div className="rounded-md border border-[#3fb950] bg-[#102018] p-4 text-sm text-[#b7f0c0]">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <div className="space-y-3">
                  <p>
                    This extraction endpoint is paywalled. Purchase once, then return from Stripe
                    with your `session_id` in the success URL to unlock this browser.
                  </p>
                  <a
                    href={paymentLink}
                    className="inline-flex h-9 items-center rounded-md bg-[#2ea043] px-4 font-medium text-white transition hover:bg-[#3fb950]"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buy Access
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          {unlocking ? (
            <div className="rounded-md border border-[#2f3744] bg-[#111822] p-3 text-sm text-[#94a3b8]">
              Validating your purchase session...
            </div>
          ) : null}

          <div
            {...getRootProps()}
            className={[
              "cursor-pointer rounded-lg border border-dashed p-6 text-center transition",
              isDragActive
                ? "border-[#3fb950] bg-[#102018]"
                : "border-[#2f3744] bg-[#0d1117] hover:border-[#3fb950]/70"
            ].join(" ")}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto mb-3 h-8 w-8 text-[#3fb950]" />
            <p className="text-sm text-[#c9d1d9]">
              {file
                ? `Selected: ${file.name}`
                : "Drop a PDF here or click to browse (max 30MB)"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c9d1d9]">Or process by URL</label>
            <Input
              type="url"
              placeholder="https://example.com/report.pdf"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>

          <Button onClick={submitPdf} disabled={!checkedAccess || loading || !canProcess || !hasAccess}>
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Processing PDF...
              </>
            ) : (
              "Extract Structured JSON"
            )}
          </Button>

          {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}

          {result ? (
            <div className="rounded-md border border-[#2f3744] bg-[#0d1117] p-3 text-sm text-[#94a3b8]">
              Processed <strong className="text-[#e6edf3]">{result.pricing.pages}</strong> page(s)
              at <strong className="text-[#e6edf3]">${result.pricing.pricePerPage.toFixed(2)}</strong>{" "}
              per page. Estimated cost: <strong className="text-[#3fb950]">${result.pricing.estimatedCost.toFixed(2)}</strong>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? <JsonViewer data={result.result} /> : null}
    </div>
  );
}
