import Link from "next/link";
import { Database, GitBranch, KeyRound, Settings2 } from "lucide-react";

const cards = [
  { name: "MongoDB", description: "Application database connection and storage.", href: "/admin/settings/integrations", icon: Database },
  { name: "API keys", description: "Manage keys used by your applications.", href: "/admin/settings/api-keys", icon: KeyRound },
  { name: "GitHub PAT", description: "Private repository access for releases and downloads.", href: "/admin/settings/github", icon: GitBranch },
];

export function ProjectIntegrationsCards() {
  return <section className="lg:col-span-2 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#13172b]"><div><h2 className="font-bold text-ink dark:text-white">Project integrations</h2><p className="mt-1 text-sm text-ink/55 dark:text-white/60">Services used by the application itself.</p></div><div className="mt-5 grid gap-4 md:grid-cols-3">{cards.map(({ name, description, href, icon: Icon }) => <div key={name} className="rounded-xl border-2 border-emerald-500/60 bg-paper p-4 dark:bg-white/[0.03]"><Icon className="text-primary" size={21} /><h3 className="mt-3 font-bold text-ink dark:text-white">{name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-ink/55 dark:text-white/55">{description}</p><Link href={href} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"><Settings2 size={14} /> Manage {name}</Link></div>)}</div></section>;
}
