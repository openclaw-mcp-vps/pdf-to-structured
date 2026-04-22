import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pdf-to-structured.app"),
  title: "PDF to Structured JSON | Extract Tables, Headings, and Lists",
  description:
    "Upload any PDF or paste a URL to get production-ready structured JSON with tables, hierarchical sections, lists, and paragraphs.",
  keywords: [
    "pdf to json",
    "document ai",
    "table extraction",
    "claude vision",
    "structured data"
  ],
  openGraph: {
    title: "PDF to Structured JSON",
    description:
      "Transform messy PDFs into clean nested JSON with page-level metadata, section hierarchy, and extracted tables.",
    url: "https://pdf-to-structured.app",
    siteName: "pdf-to-structured",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Structured JSON",
    description: "Upload PDF, receive clean nested JSON with table and section extraction."
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
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${sourceSerif.variable} antialiased`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {children}
      </body>
    </html>
  );
}
