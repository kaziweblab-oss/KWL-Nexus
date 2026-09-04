import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getApp } from "@/lib/data/apps";
import { TutorialEditor } from "@/components/admin/TutorialEditor";
import { AppMediaManager } from "@/components/admin/AppMediaManager";

// The edit route provides the tutorial and media management surface for each catalog app.
export default function AdminAppEditPage({ params }: { params: { id: string } }) {
  const app = getApp(params.id);
  if (!app) notFound();
  return (
    <main>
      <Link href="/admin/apps" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary">
        <ArrowLeft size={16} /> Back to apps
      </Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-primary">App editor</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">Edit {app.name}</h1>
      <p className="mt-2 text-ink/55">Manage app metadata, preview, screenshots and tutorial content.</p>
      <div className="mt-8">
        <h2 className="mb-5 text-2xl font-bold text-ink">Preview & Screenshots</h2>
        <p className="mb-4 text-sm text-ink/60">Change main preview (center carousel) and all screenshots. These appear on the marketplace detail page.</p>
        <AppMediaManager appId={app.id} />
      </div>
      <div className="mt-10">
        <h2 className="mb-5 text-2xl font-bold text-ink">Tutorial</h2>
        <TutorialEditor appId={app.id} initial={app.tutorial} />
      </div>
    </main>
  );
}
