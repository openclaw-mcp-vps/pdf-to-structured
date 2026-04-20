"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, FileText, Link as LinkIcon, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JsonViewer } from "@/components/JsonViewer";

interface FileUploadProps {
  initialAccess: boolean;
  initialRemainingPages: number;
}

interface ProcessingResult {
  metadata: {
    source: string;
    pageCount: number;
    extractionMode: "native-text" | "vision-fallback";
    estimatedCostUsd: number;
  };
  billing: {
    pagesCharged: number;
    pagesRemaining: number;
    chargeUsd: number;
    rateUsdPerPage: number;
  };
  [key: string]: unknown;
}

export function FileUpload({ initialAccess, initialRemainingPages }: FileUploadProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [access, setAccess] = useState(initialAccess);
  const [remainingPages, setRemainingPages] = useState(initialRemainingPages);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const accessToken = searchParams.get("access_token");

  useEffect(() => {
    const activate = async () => {
      if (!accessToken) {
        return;
      }

      setActivating(true);
      setError(null);
      try {
        const response = await fetch("/api/access/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token: accessToken })
        });

        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          remainingPages?: number;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Payment confirmation still pending.");
        }

        setAccess(true);
        setRemainingPages(payload.remainingPages ?? 0);
        router.replace("/upload");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to activate access.");
      } finally {
        setActivating(false);
      }
    };

    void activate();
  }, [accessToken, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file && !url.trim()) {
      setError("Upload a PDF file or provide a PDF URL.");
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      if (url.trim()) {
        formData.append("url", url.trim());
      }

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as ProcessingResult & { error?: string; pagesRemaining?: number };
      if (!response.ok) {
        throw new Error(payload.error || "Processing failed.");
      }

      setResult(payload);
      setRemainingPages(payload.billing.pagesRemaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-700/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Process a PDF</CardTitle>
              <CardDescription>
                Upload a file or paste a URL. We return nested JSON with sections, list items, and table rows.
              </CardDescription>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
              {access ? `${remainingPages} pages remaining` : "Locked"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!access ? (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
              <p className="font-semibold">Access required</p>
              <p className="mt-1">Complete checkout from the pricing section on the homepage to unlock processing.</p>
              <a href="/" className="mt-3 inline-block text-red-100 underline underline-offset-4">
                Go to pricing
              </a>
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <FileText className="size-4" /> PDF file
              </span>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={!access || processing}
              />
            </label>

            <div className="text-center text-xs uppercase tracking-[0.18em] text-slate-500">or</div>

            <label className="space-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <LinkIcon className="size-4" /> PDF URL
              </span>
              <Input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/invoice.pdf"
                disabled={!access || processing}
              />
            </label>

            <Button className="w-full" size="lg" type="submit" disabled={!access || processing || activating}>
              {processing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Extracting structured JSON...
                </span>
              ) : activating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Activating access...
                </span>
              ) : (
                "Extract Structured JSON"
              )}
            </Button>
          </form>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4" /> Extraction complete
              </p>
              <p className="mt-1">
                Processed {result.metadata.pageCount} pages via {result.metadata.extractionMode} at ${result.billing.rateUsdPerPage.toFixed(2)}
                /page.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? <JsonViewer data={result} /> : null}
    </div>
  );
}
