import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, KeyRound, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db/connect";
import Integration from "@/models/Integration";

const builtIn: Record<string, { label: string; clientId: string; clientSecret: string; callback: string }> = {
  google: { label: "Google", clientId: "GOOGLE_CLIENT_ID", clientSecret: "GOOGLE_CLIENT_SECRET", callback: "/api/auth/callback/google" },
  facebook: { label: "Facebook", clientId: "FACEBOOK_CLIENT_ID", clientSecret: "FACEBOOK_CLIENT_SECRET", callback: "/api/auth/callback/facebook" },
  github: { label: "GitHub", clientId: "GITHUB_CLIENT_ID", clientSecret: "GITHUB_CLIENT_SECRET", callback: "/api/auth/callback/github" },
};

export default async function OAuthManagePage({ params }: { params: { provider: string } }) {
  const key = params.provider.toLowerCase();
  const config = builtIn[key];
  let custom: { name: string; provider: string; status: string; statusMessage?: string } | null = null;
  if (!config) {
    try { await connectToDatabase(); custom = await Integration.findOne({ provider: key }).select("name provider status statusMessage").lean(); } catch { custom = null; }
    if (!custom) notFound();
  }
  const label = config?.label ?? custom!.name;
  const ready = config ? Boolean(process.env[config.clientId] && process.env[config.clientSecret]) : custom!.status === "connected";
  return <main className="mx-auto max-w-4xl"><Link href="/admin/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Back to settings</Link><div className="mt-7 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound size={24} /></span><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">OAuth management</p><h1 className="mt-1 text-3xl font-bold text-ink dark:text-white">Manage {label} OAuth</h1></div></div><div className={`mt-8 rounded-2xl border-2 p-6 ${ready ? "border-emerald-500/60" : "border-amber-400/70"}`}><div className="flex items-center gap-3">{ready ? <CheckCircle2 className="text-emerald-500" /> : <CircleAlert className="text-amber-500" />}<div><h2 className="font-bold text-ink dark:text-white">{ready ? "Active and ready" : "Setup required"}</h2><p className={`mt-1 text-sm ${ready ? "text-emerald-500" : "text-amber-500"}`}>{ready ? "Users can use this provider for login and signup." : "This provider is not active yet."}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-paper p-4 dark:bg-white/[0.04]"><p className="text-xs font-bold uppercase tracking-widest text-ink/45 dark:text-white/45">Callback URL</p><p className="mt-2 break-all font-mono text-sm text-ink dark:text-white">{config?.callback ?? `/api/auth/callback/${key}`}</p></div><div className="rounded-xl bg-paper p-4 dark:bg-white/[0.04]"><p className="text-xs font-bold uppercase tracking-widest text-ink/45 dark:text-white/45">Credentials</p><p className="mt-2 text-sm text-ink dark:text-white">{config ? `${config.clientId} and ${config.clientSecret}` : "Stored integration credentials"}</p></div></div>{!ready && <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-600 dark:text-amber-300"><ShieldCheck size={17} className="mb-2" /> Add the required provider credentials and restart the application before enabling login.</div>}</div></main>;
}
