import { Suspense } from "react";
import { ChevronRight, FileCog, FileSpreadsheet, ScanLine, ShieldCheck } from "lucide-react";

import { FileUpload } from "@/components/FileUpload";
import { PricingCard } from "@/components/PricingCard";
import { Badge } from "@/components/ui/badge";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

const faq = [
  {
    q: "Does this work on scanned PDFs and images embedded in PDFs?",
    a: "Yes. The extractor is designed to use Claude vision when an API key is configured, so scanned pages and mixed-layout documents are parsed into structured blocks."
  },
  {
    q: "What JSON structure do I get back?",
    a: "You get nested sections with heading levels, paragraph nodes, list nodes, and normalized table arrays. Metadata includes source, page count, timestamp, and model used."
  },
  {
    q: "How do I unlock processing after payment?",
    a: "Use a Stripe Payment Link success URL that returns users to this page with `?session_id={CHECKOUT_SESSION_ID}`. The app validates that session against your webhook feed and sets a secure cookie."
  },
  {
    q: "Is this suitable for production ingestion pipelines?",
    a: "Yes. Responses are deterministic JSON, easy to validate and forward to ETL jobs, RAG chunkers, and downstream analytics workflows."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#2f3744] bg-[#111822]/80 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.4)] md:p-12">
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[#2ea043]/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-[#1f6feb]/20 blur-3xl" />

        <Badge className="mb-5 border-[#2ea043] bg-[#11261a] text-[#8bff9e]">Document AI for Indie Builders</Badge>
        <h1
          className="max-w-3xl text-4xl font-semibold leading-tight text-[#e6edf3] md:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PDF to Structured JSON. Turn Any Document Into Pipeline-Ready Data.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-[#94a3b8] md:text-lg">
          Upload a file or paste a URL. Get clean JSON with section hierarchy, table rows,
          paragraphs, and lists in one API call. Built for teams that need real extraction without
          enterprise sales calls.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#c9d1d9]">
          <div className="rounded-full border border-[#2f3744] bg-[#0d1117] px-3 py-1">$0.05 per page</div>
          <div className="rounded-full border border-[#2f3744] bg-[#0d1117] px-3 py-1">$29/mo for 1000 pages</div>
          <div className="rounded-full border border-[#2f3744] bg-[#0d1117] px-3 py-1">No signup wall</div>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[#2f3744] bg-[#161b22] p-6">
          <h2 className="mb-2 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            The Problem
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Existing document extraction platforms target enterprise buyers. Indie teams get hit with
            minimum commitments, account manager friction, and inflexible contracts.
          </p>
        </article>
        <article className="rounded-xl border border-[#2f3744] bg-[#161b22] p-6">
          <h2 className="mb-2 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            The Solution
          </h2>
          <p className="text-sm text-[#94a3b8]">
            This app extracts machine-ready structure from PDFs with vision support for scanned pages,
            then returns deterministic JSON your backend can parse in seconds.
          </p>
        </article>
        <article className="rounded-xl border border-[#2f3744] bg-[#161b22] p-6">
          <h2 className="mb-2 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Who Pays
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Developers building ingestion pipelines, compliance tooling, RAG preprocessors, and
            analytics automations that need dependable document structure.
          </p>
        </article>
      </section>

      <section className="mt-14 grid gap-6 rounded-2xl border border-[#2f3744] bg-[#161b22]/85 p-6 md:grid-cols-2">
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Why teams switch from legacy extraction APIs
          </h2>
          <ul className="space-y-4 text-sm text-[#c9d1d9]">
            <li className="flex items-start gap-3">
              <ScanLine className="mt-0.5 h-4 w-4 text-[#3fb950]" />
              Handles scanned PDFs and messy layouts with vision-first extraction.
            </li>
            <li className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 text-[#3fb950]" />
              Preserves tables as rows and headers instead of flattened text blobs.
            </li>
            <li className="flex items-start gap-3">
              <FileCog className="mt-0.5 h-4 w-4 text-[#3fb950]" />
              Returns hierarchical JSON for direct ETL and indexing.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-[#3fb950]" />
              Paywall and webhook validation included so billing is enforceable out of the box.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-[#2f3744] bg-[#0d1117] p-5">
          <h3 className="mb-3 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Output Example Shape
          </h3>
          <pre className="overflow-auto rounded-md border border-[#2f3744] bg-[#111822] p-4 text-xs text-[#94a3b8]">
{`{
  "metadata": { "pageCount": 12, "sourceType": "upload" },
  "sections": [
    {
      "type": "section",
      "heading": "3. Revenue Breakdown",
      "level": 2,
      "children": [
        { "type": "paragraph", "text": "..." },
        { "type": "table", "headers": ["Region", "Q1"], "rows": [["NA", "120000"]] }
      ]
    }
  ]
}`}
          </pre>
        </div>
      </section>

      <section id="tool" className="mt-14">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Run the extractor
          </h2>
          <a href="#pricing" className="inline-flex items-center text-sm text-[#8bff9e] hover:underline">
            See pricing <ChevronRight className="ml-1 h-4 w-4" />
          </a>
        </div>
        <Suspense
          fallback={
            <div className="rounded-xl border border-[#2f3744] bg-[#161b22] p-6 text-sm text-[#94a3b8]">
              Loading extractor...
            </div>
          }
        >
          <FileUpload paymentLink={paymentLink} />
        </Suspense>
      </section>

      <section id="pricing" className="mt-14">
        <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Pricing
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <PricingCard
            title="Pay As You Go"
            price="$0.05/page"
            subtitle="No monthly commitment. Ideal for variable workloads and prototyping."
            features={[
              "Process any PDF on-demand",
              "Vision extraction for scanned pages",
              "Cookie-unlocked tool after purchase",
              "Flat predictable page billing"
            ]}
            ctaLabel="Start with Stripe Checkout"
            ctaHref={paymentLink}
            featured
          />
          <PricingCard
            title="Builder Monthly"
            price="$29/mo"
            subtitle="Includes 1,000 pages/month. Effective rate: $0.029/page."
            features={[
              "Best for recurring ingestion pipelines",
              "Lower blended cost at scale",
              "Same extraction quality and JSON schema",
              "Webhook-driven access validation"
            ]}
            ctaLabel="Choose Monthly Plan"
            ctaHref={paymentLink}
          />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          FAQ
        </h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <article key={item.q} className="rounded-xl border border-[#2f3744] bg-[#161b22] p-5">
              <h3 className="text-base font-semibold text-[#e6edf3]" style={{ fontFamily: "var(--font-display)" }}>
                {item.q}
              </h3>
              <p className="mt-2 text-sm text-[#94a3b8]">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
