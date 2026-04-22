"use client";

import { type FormEvent, useMemo, useState } from "react";
import { ExternalLink, FileJson2, Lock, UploadCloud } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JsonViewer } from "@/components/JsonViewer";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  hasAccess: boolean;
  accessEmail?: string;
}

interface UploadResponse {
  uploadId: string;
  fileName: string;
  pageCount: number;
  bytes: number;
}

interface ProcessingPayload {
  data: Record<string, unknown>;
}

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const errorMessage = typeof payload.error === "string" ? payload.error : "Request failed.";
    throw new Error(errorMessage);
  }

  return payload;
}

export function FileUpload({ hasAccess, accessEmail }: FileUploadProps) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadResponse | null>(null);

  const estimatedUploadCost = useMemo(() => {
    if (!lastUpload) {
      return null;
    }

    return Number((lastUpload.pageCount * 0.05).toFixed(2));
  }, [lastUpload]);

  async function handleUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlockBusy(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/paywall/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: unlockEmail })
      });

      await parseJsonResponse(response);
      setStatus("Access unlocked. Loading tool...");
      window.location.reload();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unable to unlock access.");
    } finally {
      setUnlockBusy(false);
    }
  }

  async function handleProcessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    setResult(null);

    try {
      let processRequestBody: Record<string, unknown>;
      if (mode === "file") {
        if (!file) {
          throw new Error("Select a PDF file first.");
        }

        setStatus("Uploading PDF...");
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const uploadPayload = (await parseJsonResponse(uploadResponse)) as unknown as UploadResponse;
        setLastUpload(uploadPayload);

        processRequestBody = {
          uploadId: uploadPayload.uploadId,
          sourceName: uploadPayload.fileName
        };
      } else {
        if (!url.trim()) {
          throw new Error("Paste a PDF URL first.");
        }

        processRequestBody = {
          url: url.trim()
        };
      }

      setStatus("Extracting headings, lists, and table rows...");
      const processResponse = await fetch("/api/process-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(processRequestBody)
      });

      const payload = (await parseJsonResponse(processResponse)) as unknown as ProcessingPayload;
      setResult(payload.data);
      setStatus("Extraction complete.");
    } catch (processingError) {
      setError(processingError instanceof Error ? processingError.message : "Processing failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lock size={20} className="text-[var(--brand)]" />
            Tool Access Is Locked
          </CardTitle>
          <CardDescription>
            Purchase access first, then unlock this browser using the same checkout email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] bg-[#0b1322] p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Buy with Stripe Checkout, then return here and unlock. Your access cookie lasts 30 days.
            </p>
            <a
              href={paymentLink}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
            >
              Buy Access
              <ExternalLink size={16} />
            </a>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-3">
            <label htmlFor="unlock-email" className="block text-sm text-[var(--text-secondary)]">
              Purchase email
            </label>
            <Input
              id="unlock-email"
              type="email"
              required
              value={unlockEmail}
              onChange={(event) => setUnlockEmail(event.target.value)}
              placeholder="you@company.com"
            />
            <Button type="submit" className="w-full" disabled={unlockBusy}>
              {unlockBusy ? "Checking purchase..." : "Unlock Tool"}
            </Button>
          </form>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {status ? <p className="text-sm text-[var(--success)]">{status}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileJson2 size={20} className="text-[var(--brand)]" />
            Convert PDF to Structured JSON
          </CardTitle>
          <CardDescription>
            Signed in as <span className="mono text-[var(--text-primary)]">{accessEmail}</span>. Upload a PDF file or
            paste a PDF URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "secondary"}
              onClick={() => setMode("file")}
              disabled={busy}
              className="flex-1"
            >
              Upload PDF
            </Button>
            <Button
              variant={mode === "url" ? "default" : "secondary"}
              onClick={() => setMode("url")}
              disabled={busy}
              className="flex-1"
            >
              PDF URL
            </Button>
          </div>

          <form onSubmit={handleProcessSubmit} className="space-y-4">
            {mode === "file" ? (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[#0b1322] p-6 text-center">
                <UploadCloud size={28} className="mb-2 text-[var(--brand)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "Click to choose a PDF"}
                </span>
                <Input
                  className="sr-only"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="space-y-2">
                <label htmlFor="pdf-url" className="block text-sm text-[var(--text-secondary)]">
                  Public PDF URL
                </label>
                <Input
                  id="pdf-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/document.pdf"
                />
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Processing..." : "Extract Structured JSON"}
            </Button>
          </form>

          {status ? <p className="mt-4 text-sm text-[var(--success)]">{status}</p> : null}
          {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
          {estimatedUploadCost !== null ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Last upload: {lastUpload?.pageCount} pages, estimated pay-as-you-go cost <span className="mono">${estimatedUploadCost.toFixed(2)}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {result ? <JsonViewer data={result} /> : null}
    </div>
  );
}
