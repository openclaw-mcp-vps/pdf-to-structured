"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open?: (url: string) => void;
      };
    };
  }
}

interface PricingCardProps {
  title: string;
  subtitle: string;
  price: string;
  plan: "payg" | "subscription";
  features: string[];
  highlight?: boolean;
}

export function PricingCard({ title, subtitle, price, plan, features, highlight = false }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const openCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan,
          email: email || undefined
        })
      });

      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Could not start checkout.");
      }

      const openOverlay = window.LemonSqueezy?.Url?.Open;
      if (openOverlay) {
        openOverlay(payload.checkoutUrl);
      } else {
        window.location.href = payload.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not start.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "h-full border-slate-700/80",
        highlight && "border-sky-400/60 bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-950"
      )}
    >
      <CardHeader>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {highlight ? <Badge>Best For Most Teams</Badge> : <Badge variant="muted">Flexible</Badge>}
        </div>
        <div className="text-3xl font-bold tracking-tight text-slate-50">{price}</div>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Email for receipt (optional)</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </label>

        <ul className="space-y-2 text-sm text-slate-200">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" onClick={openCheckout} disabled={loading}>
          {loading ? "Launching checkout..." : "Unlock Processing"}
        </Button>
      </CardFooter>
    </Card>
  );
}
