import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { getApp } from "@/lib/data/apps";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { ProtectedDownloadButton } from "@/components/shared/ProtectedDownloadButton";

// Tutorials are deliberately public; only the adjacent download action is protected.
export default function TutorialPage({ params }: { params: { id: string } }) {
  const app = getApp(params.id);
  if (!app?.tutorial?.isActive) notFound();
  return <main className="mx-auto max-w-5xl px-6 pb-24 pt-14 lg:px-8"><Link href={`/apps/${app.id}`} className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary"><ArrowLeft size={16} /> Back to {app.name}</Link><div className="mt-12 max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">How to use</p><h1 className="mt-3 text-5xl font-bold tracking-[-0.04em] text-ink">{app.tutorial.title}</h1><p className="mt-5 text-lg leading-8 text-ink/60">{app.tutorial.description}</p></div><div className="mt-10"><VideoPlayer url={app.tutorial.videoUrl} type={app.tutorial.videoType} /></div><div className="mt-6 flex flex-wrap items-center gap-4"><ProtectedDownloadButton label={`Download ${app.name}`} /><span className="flex items-center gap-2 text-sm text-ink/45"><Lock size={14} /> Sign in required for downloads</span></div></main>;
}
