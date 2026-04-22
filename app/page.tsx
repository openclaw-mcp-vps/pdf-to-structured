import Link from "next/link";
import { cookies } from "next/headers";

import { PricingCard } from "@/components/PricingCard";
import { ToolWorkspace } from "@/components/ToolWorkspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isToolAccessGranted, TOOL_ACCESS_COOKIE } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

const problems = [
  "PDFs mix headings, tables, and free text with inconsistent formatting across vendors and template versions.",
  "Most enterprise document APIs force annual contracts, account setup friction, and expensive minimums.",
  "OCR quality drops for scanned pages, causing broken table rows and flattened section context in downstream jobs."
];

const solutions = [
  "Claude vision reads both digital and scanned PDFs, preserving structural context for nested JSON output.",
  "Outputs include section hierarchy, paragraph blocks, list items, and normalized table arrays ready for ETL or RAG.",
  "Transparent economics: $0.05/page pay-as-you-go or $29/month for 1,000 pages with browser-based unlock flow."
];

const faqs = [
  {
    question: "What does the extracted JSON contain?",
    answer:
      "Each response includes nested sections, paragraphs, lists, and table objects with headers and row arrays. You can feed it directly into job queues, vectorizers, or validators."
  },
  {
    question: "How does scanned PDF support work?",
    answer:
      "The processor sends the PDF to Claude vision. If text extraction is weak, vision context still reconstructs layout and table structure, then returns JSON with confidence warnings."
  },
  {
    question: "How is access controlled after payment?",
    answer:
      "Stripe sends a signed checkout webhook, your session ID is verified, and a browser cookie unlocks the processing endpoint for that user session."
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No sign-up flow is required. Checkout with Stripe, unlock with your session ID, and start processing immediately."
  }
];

export default async function Home(): Promise<JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(TOOL_ACCESS_COOKIE)?.value;
  const unlocked = await isToolAccessGranted(accessToken);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="animate-rise-in grid gap-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Document AI for Indie Builders</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold leading-tight text-slate-50 sm:text-5xl">
            PDF to Structured JSON
            <span className="block text-cyan-300">Extract tables + hierarchy in one request.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Upload any PDF or paste a URL. Get clean JSON with nested sections, list data, and normalized tables at a price
            designed for real pipelines: $0.05/page.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#tool"
              className="inline-flex h-11 items-center justify-center rounded-md bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start Extracting
            </Link>
            <Link
              href="#pricing"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              See Pricing
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="animate-pulse-border rounded-xl border border-cyan-900/60 bg-[#010409] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pipeline Snapshot</p>
            <p className="mt-2 text-sm text-slate-200">Input: invoice-batch.pdf (42 pages)</p>
            <p className="mt-1 text-sm text-slate-200">Output: 17 sections, 11 tables, 96 list items</p>
            <p className="mt-1 text-sm text-emerald-300">Estimated cost: $2.10</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-300">Best for:</p>
            <p className="mt-1 text-sm text-slate-200">Contract parsing • Compliance ingestion • Procurement automation • Data room indexing</p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Problem</CardTitle>
            <CardDescription>Unstructured PDFs break downstream automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {problems.map((problem) => (
              <p key={problem} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
                {problem}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solution</CardTitle>
            <CardDescription>Structure-first extraction tuned for developer workloads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {solutions.map((solution) => (
              <p key={solution} className="rounded-lg border border-cyan-950 bg-cyan-950/20 p-3 text-sm text-cyan-100">
                {solution}
              </p>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="tool" className="mt-10 scroll-mt-20">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-50">Extraction Workspace</h2>
            <p className="text-sm text-slate-400">Run real documents through the parser and inspect the JSON payload before shipping it to production.</p>
          </div>
          <span className={`text-xs uppercase tracking-[0.2em] ${unlocked ? "text-emerald-300" : "text-amber-300"}`}>
            {unlocked ? "Access unlocked" : "Locked until purchase"}
          </span>
        </div>

        {unlocked ? (
          <ToolWorkspace />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tool Access Locked</CardTitle>
              <CardDescription>
                Complete Stripe checkout, then use your Checkout Session ID to unlock processing in this browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                This paywall prevents abuse and keeps pricing low for independent developers running ingestion pipelines.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section id="pricing" className="mt-10 scroll-mt-20">
        <PricingCard unlocked={unlocked} />
      </section>

      <section className="mt-10">
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-50">FAQ</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
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
