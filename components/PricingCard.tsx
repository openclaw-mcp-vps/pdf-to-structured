"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PricingCardProps = {
  unlocked: boolean;
};

export function PricingCard({ unlocked }: PricingCardProps): JSX.Element {
  const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";

  const [sessionId, setSessionId] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const unlockAccess = async (): Promise<void> => {
    setUnlocking(true);
    setUnlockError(null);

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId: sessionId.trim() })
      });

      const payload = (await response.json().catch(() => ({ error: "Unlock failed." }))) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Unlock failed.");
      }

      window.location.reload();
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : "Unlock failed.");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Card className="border-cyan-900/60 bg-gradient-to-b from-slate-950 to-slate-950/60">
      <CardHeader>
        <CardTitle>Pricing Built for API Pipelines</CardTitle>
        <CardDescription>
          Pay by page for burst workloads, or use the monthly plan for stable ingestion volume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pay-as-you-go</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-300">$0.05 / page</p>
            <p className="mt-2 text-sm text-slate-400">
              Ideal for sporadic documents, R&D, and startup pipelines that need predictable extraction costs.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Monthly</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-300">$29 / month</p>
            <p className="mt-2 text-sm text-slate-400">Includes 1,000 pages each month with overage billed at the same per-page rate.</p>
          </div>
        </div>

        <a
          href={stripePaymentLink}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          target="_blank"
          rel="noreferrer"
        >
          Buy Access in Stripe Checkout
        </a>

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-slate-100">Already purchased?</p>
          <p className="mt-1 text-xs text-slate-400">
            Paste the Stripe Checkout Session ID from your success URL and unlock this browser instantly.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="cs_test_a1B2c3D4e5"
              disabled={unlocking || unlocked}
            />
            <Button type="button" onClick={unlockAccess} disabled={unlocking || unlocked}>
              {unlocked ? "Unlocked" : unlocking ? "Unlocking..." : "Unlock"}
            </Button>
          </div>

          {unlockError ? <p className="mt-3 text-sm text-rose-300">{unlockError}</p> : null}
          {unlocked ? <p className="mt-3 text-sm text-emerald-300">This browser has active tool access.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
