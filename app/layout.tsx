import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const bodyFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "PDF to Structured JSON | Tables + Hierarchical Sections",
  description:
    "Upload any PDF or paste a URL and extract clean nested JSON with headings, paragraphs, lists, and table rows. Built for document pipelines at $0.05/page.",
  keywords: [
    "pdf to json",
    "document ai",
    "table extraction",
    "ocr pdf",
    "anthropic claude vision",
    "structured data extraction"
  ],
  openGraph: {
    title: "PDF to Structured JSON",
    description:
      "Turn PDFs into clean nested JSON with table extraction, heading hierarchy, and list parsing for production pipelines.",
    type: "website",
    url: "https://pdf-to-structured.dev",
    siteName: "PDF to Structured JSON"
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Structured JSON",
    description: "Convert PDFs into production-ready structured JSON at $0.05/page."
  },
  metadataBase: new URL("https://pdf-to-structured.dev")
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="font-[var(--font-body)] antialiased">{children}</body>
    </html>
  );
}
