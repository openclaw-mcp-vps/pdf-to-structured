import Link from "next/link";
import { cookies } from "next/headers";
import { FileCheck2 } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { getAccessRecord } from "@/lib/database";

export default async function UploadPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pdf_access_token")?.value;
  const access = await getAccessRecord(token);

  const hasAccess = Boolean(access && access.status === "paid" && access.pagesUsed < access.pagesPurchased);
  const remaining = hasAccess && access ? access.pagesPurchased - access.pagesUsed : 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 pb-14 pt-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-slate-100">
          ← Back to home
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
          <FileCheck2 className="size-4 text-sky-300" />
          API Processing Console
        </div>
      </header>

      <section className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Extract Structured JSON from PDFs</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          This console is connected to `/api/process-pdf`. The response includes section hierarchy, table data, mode
          (native text vs vision fallback), and billing metadata.
        </p>
      </section>

      <FileUpload initialAccess={hasAccess} initialRemainingPages={remaining} />
    </main>
  );
}
