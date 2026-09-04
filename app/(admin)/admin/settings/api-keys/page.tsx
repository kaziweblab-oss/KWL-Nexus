import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { ApiKeyManagerFull } from "@/components/admin/ApiKeyManager";

export default function ApiKeysPage() {
  return <main className="mx-auto max-w-5xl"><Link href="/admin/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Back to settings</Link><div className="mt-6 flex items-center gap-3"><KeyRound className="text-primary" size={28} /><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Developer access</p><h1 className="mt-1 text-3xl font-bold text-ink dark:text-white">API key management</h1></div></div><p className="mt-3 max-w-2xl text-sm text-ink/60 dark:text-white/60">Create and revoke keys used by your applications. Plaintext is shown only once after generation.</p><div className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#13172b]"><ApiKeyManagerFull /></div></main>;
}
