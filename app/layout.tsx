import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = "https://pdf-to-structured.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PDF to Structured JSON | Table + Section Extraction for Dev Pipelines",
  description:
    "Upload any PDF or paste a URL and get hierarchical JSON with tables, headings, paragraphs, and lists. Built for document-processing pipelines. $0.05/page.",
  keywords: [
    "pdf to json",
    "document ai",
    "table extraction",
    "claude vision",
    "structured output",
    "pdf parser api"
  ],
  openGraph: {
    title: "PDF to Structured JSON",
    description:
      "Transform messy PDFs into clean nested JSON with tables and section hierarchy.",
    url: siteUrl,
    siteName: "PDF to Structured",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Structured JSON",
    description:
      "Extract tables, headings, lists, and paragraphs from PDFs into production-ready JSON."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
