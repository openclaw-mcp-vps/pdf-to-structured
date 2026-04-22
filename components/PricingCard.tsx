import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingCardProps {
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
}

export function PricingCard({
  title,
  price,
  subtitle,
  features,
  ctaLabel,
  ctaHref,
  featured
}: PricingCardProps) {
  return (
    <Card
      className={[
        "h-full",
        featured
          ? "border-[#3fb950] shadow-[0_30px_80px_rgba(46,160,67,0.2)]"
          : "border-[#2f3744]"
      ].join(" ")}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {featured ? <Badge className="border-[#3fb950] text-[#8bff9e]">Most Popular</Badge> : null}
        </div>
        <div className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          {price}
        </div>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-[#c9d1d9]">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#3fb950]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <a
          href={ctaHref}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#2ea043] px-4 text-sm font-medium text-white transition hover:bg-[#3fb950]"
          target="_blank"
          rel="noreferrer"
        >
          {ctaLabel}
        </a>
      </CardContent>
    </Card>
  );
}
