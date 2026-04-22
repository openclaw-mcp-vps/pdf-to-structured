import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

const plans = [
  {
    name: "Pay As You Go",
    price: "$0.05/page",
    subtitle: "No monthly commitment",
    features: [
      "JSON output with section hierarchy + table rows",
      "Claude-powered OCR for scanned PDFs",
      "Fast API for ingestion pipelines",
      "Unlock access with your purchase email"
    ]
  },
  {
    name: "Pipeline Builder",
    price: "$29/mo",
    subtitle: "Includes 1,000 pages per month",
    features: [
      "Effective rate: $0.029/page",
      "Predictable monthly billing",
      "Best fit for recurring extraction jobs",
      "Same API + JSON format as pay-as-you-go"
    ]
  }
];

export function PricingCard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plans.map((plan) => (
        <Card key={plan.name} className="h-full">
          <CardHeader>
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.subtitle}</CardDescription>
            <p className="mt-2 text-3xl font-semibold text-[var(--brand)]">{plan.price}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-[var(--success)]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <a
              href={paymentLink}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!paymentLink}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full",
                !paymentLink ? "pointer-events-none opacity-50" : undefined
              )}
            >
              Buy Access
            </a>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
