import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "PDF to Structured JSON",
    template: "%s | PDF to Structured JSON"
  },
  description:
    "Upload a PDF or paste a URL and extract hierarchical JSON with clean sections, lists, and table data.",
  keywords: [
    "pdf extraction",
    "pdf to json",
    "document ai",
    "table extraction",
    "claude vision"
  ],
  openGraph: {
    title: "PDF to Structured JSON",
    description:
      "Convert messy PDFs into pipeline-ready JSON with heading hierarchy, clean paragraphs, and table rows.",
    type: "website",
    url: "/",
    siteName: "PDF to Structured JSON"
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Structured JSON",
    description:
      "Upload any PDF and get clean nested JSON with sections, lists, and extracted table rows."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}

