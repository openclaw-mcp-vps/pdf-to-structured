import Link from "next/link";
import { ArrowRight, FileJson2, ScanSearch, Table2, Zap } from "lucide-react";
import { PricingCard } from "@/components/PricingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "How accurate is table extraction?",
    answer:
      "Native-text PDFs preserve cell boundaries and are parsed directly. Scanned tables route through Claude vision, then normalized into row/column JSON."
  },
  {
    question: "Can I process large batches?",
    answer:
      "Yes. The API is optimized for pipeline usage: POST PDFs or URLs, then consume a deterministic JSON structure for downstream automation."
  },
  {
    question: "What counts as a billable page?",
    answer:
      "Every page processed counts once, whether parsed from embedded text or scanned with vision fallback. Rate is fixed at $0.05/page."
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account required. Checkout grants a cookie-based access token immediately after payment so you can start processing right away."
  }
];

const solutionPoints = [
  {
    icon: FileJson2,
    title: "Hierarchical JSON",
    description:
      "Outputs nested sections with heading levels, paragraphs, list groups, and metadata you can map directly to your schema."
  },
  {
    icon: Table2,
    title: "Usable Table Objects",
    description:
      "Returns each table as `headers` + `rows` arrays so you can push directly into analytics, ETL, or vectorization jobs."
  },
  {
    icon: ScanSearch,
    title: "Scanned PDF Recovery",
    description:
      "When native text extraction is weak, pages are rendered and analyzed with Claude vision to preserve structure from image-only docs."
  },
  {
    icon: Zap,
    title: "Built for Pipelines",
    description:
      "Simple API surface, URL ingestion support, deterministic response format, and predictable pay-per-page pricing."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-20 pt-8 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-100">
          pdf-to-structured
        </Link>
        <Button variant="outline" asChild>
          <Link href="/upload">Open Tool</Link>
        </Button>
      </header>

      <section className="mt-14 grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Badge className="w-fit">Document AI for builders</Badge>
          <h1 className="text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">
            PDF to Structured JSON
            <span className="block text-sky-300">Tables + Sections + Lists in one API call</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
            Upload any PDF or pass a URL. Get clean nested JSON that includes heading hierarchy, paragraphs, list blocks,
            and machine-usable table data. Pricing starts at <span className="font-semibold text-sky-300">$0.05/page</span>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="#pricing" className="flex items-center gap-2">
                Unlock Processing <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/upload">Try Upload UI</Link>
            </Button>
          </div>
        </div>

        <Card className="glass border-sky-400/30">
          <CardHeader>
            <CardTitle>Why devs switch from enterprise parsers</CardTitle>
            <CardDescription>
              Existing document-AI vendors optimize for procurement cycles, not indie shipping speed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200">
            <p>1. Overpriced usage tiers with minimum spend and annual lock-ins.</p>
            <p>2. Output is often inconsistent across scanned pages and mixed layouts.</p>
            <p>3. Setup friction blocks quick experiments in side projects and internal tools.</p>
            <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sky-100">
              This product keeps pricing predictable and output schema stable so parsing can be a utility, not a project.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-20" id="solution">
        <h2 className="text-3xl font-semibold text-slate-50">What You Get</h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          Purpose-built extraction for developer workflows: less cleanup code, fewer brittle regex patches, faster time to
          production.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {solutionPoints.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="surface border-slate-700/80">
              <CardHeader className="pb-2">
                <div className="mb-2 inline-flex w-fit rounded-lg border border-sky-400/40 bg-sky-500/10 p-2 text-sky-300">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-300">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20" id="pricing">
        <h2 className="text-3xl font-semibold text-slate-50">Simple Pricing</h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          Pay as you go for sporadic workloads, or lock in a monthly bundle if you process docs continuously.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <PricingCard
            title="Pay As You Go"
            subtitle="Best for variable usage and early-stage products"
            price="$0.05 / page"
            plan="payg"
            features={[
              "No subscription required",
              "Great for low-volume and bursty workloads",
              "Direct upload or URL ingestion",
              "Structured JSON with table + hierarchy extraction"
            ]}
          />
          <PricingCard
            title="Builder Subscription"
            subtitle="For teams running document pipelines daily"
            price="$29 / month"
            plan="subscription"
            highlight
            features={[
              "Includes 1000 pages / month",
              "Automatic access token refresh via checkout",
              "Ideal for recurring ingestion jobs",
              "4-6x cheaper than typical enterprise alternatives"
            ]}
          />
        </div>
      </section>

      <section className="mt-20" id="faq">
        <h2 className="text-3xl font-semibold text-slate-50">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <Card key={faq.question} className="border-slate-700/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-300">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
