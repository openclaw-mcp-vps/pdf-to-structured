import { cookies } from "next/headers";
import { ArrowRight, BrainCircuit, FileStack, Layers, ScanSearch, Table2 } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { PricingCard } from "@/components/PricingCard";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/lemonsqueezy";

const problemPoints = [
  "PDFs hide structure in visual layout, which breaks downstream automation.",
  "Traditional OCR ignores heading hierarchy and list semantics.",
  "Enterprise document AI tools gate pricing behind sales calls and annual contracts."
];

const solutionPoints = [
  "Upload a file or paste a URL and get nested JSON in one pass.",
  "Tables are returned as normalized header+row arrays, ready for ETL.",
  "Scanned documents can route through Claude vision extraction.",
  "Simple paywall: pay once, unlock instantly with your checkout email."
];

const faqItems = [
  {
    question: "What JSON structure do I get back?",
    answer:
      "Each response includes document metadata, hierarchical sections, normalized tables, detected lists, and a pricing estimate by page count."
  },
  {
    question: "How does scanned PDF handling work?",
    answer:
      "When text density is low, the processor converts pages to images and submits them to Claude vision so headings and tables can still be reconstructed."
  },
  {
    question: "How is access enforced after payment?",
    answer:
      "Stripe webhook events record paid checkout emails. The unlock endpoint validates that email and issues an HttpOnly access cookie for this browser."
  },
  {
    question: "Is this suitable for production pipelines?",
    answer:
      "Yes. The API returns deterministic JSON shape and includes fallback parsing when model extraction is unavailable, so your ingestion flow remains stable."
  }
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const accessPayload = verifyAccessToken(accessToken);
  const hasAccess = Boolean(accessPayload);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(120deg,#111d35_0%,#0d1117_55%)] p-8 sm:p-10">
        <div className="absolute right-[-90px] top-[-90px] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(88,166,255,0.4)_0%,rgba(88,166,255,0)_70%)]" />
        <div className="relative max-w-3xl">
          <p className="mono mb-4 inline-flex rounded-full border border-[var(--border)] bg-[#111c31] px-3 py-1 text-xs text-[var(--brand)]">
            document-ai · pay as you go
          </p>
          <h1 className="text-balance text-3xl font-semibold sm:text-5xl">
            PDF to Structured JSON for Developers
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
            Upload any PDF and get clean nested JSON with hierarchical sections, extracted tables, paragraphs, and lists.
            Built for ingestion pipelines, not manual copy-paste.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#tool"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-strong)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand)]"
            >
              Try The Tool
              <ArrowRight size={16} />
            </a>
            <span className="mono text-sm text-[var(--text-secondary)]">$0.05/page · $29/mo for 1,000 pages</span>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <FileStack className="mb-3 text-[var(--brand)]" />
          <h2 className="text-lg font-semibold">One JSON shape for every document</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Keep ingestion logic stable with a predictable schema for sections, tables, and list blocks.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <ScanSearch className="mb-3 text-[var(--brand)]" />
          <h2 className="text-lg font-semibold">Scanned PDF coverage</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Vision fallback handles low-text scans where traditional parsers fail.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <BrainCircuit className="mb-3 text-[var(--brand)]" />
          <h2 className="text-lg font-semibold">Built for pipeline speed</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            From upload to JSON response in one workflow, with no account wall before checkout.
          </p>
        </article>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Layers size={18} className="text-[var(--brand)]" />
            Problem
          </h3>
          <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
            {problemPoints.map((point) => (
              <li key={point} className="rounded-md bg-[#0b1322] p-3">
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Table2 size={18} className="text-[var(--brand)]" />
            Solution
          </h3>
          <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
            {solutionPoints.map((point) => (
              <li key={point} className="rounded-md bg-[#0b1322] p-3">
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="mt-14">
        <h3 className="mb-4 text-2xl font-semibold">Pricing</h3>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Transparent developer pricing with Stripe hosted checkout. No sales calls, no hidden overage math.
        </p>
        <PricingCard />
      </section>

      <section id="tool" className="mt-14">
        <h3 className="mb-4 text-2xl font-semibold">Tool</h3>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          The extractor is paywalled. Complete checkout, then unlock this browser with your purchase email.
        </p>
        <FileUpload hasAccess={hasAccess} accessEmail={accessPayload?.email} />
      </section>

      <section id="faq" className="mt-14">
        <h3 className="mb-4 text-2xl font-semibold">FAQ</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
              <h4 className="font-semibold">{item.question}</h4>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

