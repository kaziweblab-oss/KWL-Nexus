import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Monitor, Smartphone, Terminal } from "lucide-react";
import { PaymentRequestForm } from "@/components/shared/PaymentRequestForm";
import { FeedbackForm } from "@/components/shared/FeedbackForm";
import { ProtectedDownloadButton } from "@/components/shared/ProtectedDownloadButton";
import { PlanSelectButton } from "@/components/shared/PlanSelectButton";
import { getApp } from "@/lib/data/apps";

export default function AppDetailPage({ params }: { params: { id: string } }) {
  const app = getApp(params.id);
  if (!app) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-14 lg:px-8">
      <Link href="/apps" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary">
        <ArrowLeft size={16} /> অ্যাপ্লিকেশনে ফিরুন
      </Link>

      <section className="mt-12 grid gap-12 lg:grid-cols-[1fr_0.8fr]">
        {/* Left Column - App Info */}
        <div>
          <div className="grid h-24 w-24 place-items-center rounded-[1.75rem] text-4xl text-white shadow-xl" style={{ backgroundColor: app.accent }}>
            {app.icon}
          </div>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-primary">{app.category}</p>
          <h1 className="mt-3 text-6xl font-bold tracking-[-0.05em] text-ink dark:text-white">{app.name}</h1>
          <p className="mt-6 max-w-xl text-xl leading-9 text-ink/60 dark:text-white/60">{app.longDescription}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {app.platforms.map((platform) => (
              <span key={platform} className="flex items-center gap-2 rounded-full border border-ink/10 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-sm font-medium text-ink/60 dark:text-white/60">
                {platform === "Android" ? <Smartphone size={15} /> : platform === "Windows" ? <Monitor size={15} /> : <Terminal size={15} />}
                {platform}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column - Plan Selection */}
        <div className="rounded-[1.5rem] border border-ink/10 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm p-6 shadow-sm">
          <p className="text-sm font-semibold text-ink/45 dark:text-white/60">প্ল্যান নির্বাচন করুন</p>
          <div className="mt-5 space-y-3">
            {app.plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-4 transition ${
                  plan.featured
                    ? "border-primary bg-primary/[.05] dark:bg-primary/10"
                    : "border-ink/10 dark:border-white/10 hover:border-primary/30 dark:hover:border-secondary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink dark:text-white">{plan.name}</p>
                  {plan.featured && (
                    <span className="rounded-full bg-primary dark:bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white dark:text-ink">
                      জনপ্রিয়
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-ink dark:text-white">
                  {plan.price}
                  <span className="text-xs font-medium text-ink/45 dark:text-white/60">{plan.cadence}</span>
                </p>
                <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{plan.description}</p>
                <PlanSelectButton appId={app.id} planName={plan.name} planPrice={plan.price} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/apps/${app.id}/tutorial`}
          className="rounded-full border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition"
        >
          ব্যবহার পদ্ধতি
        </Link>
        <ProtectedDownloadButton label="অ্যাপ ডাউনলোড করুন" />
        <Link href="#contact" className="rounded-full border border-ink/10 dark:border-white/10 px-5 py-3 text-sm font-semibold text-ink dark:text-white hover:bg-ink/5 dark:hover:bg-white/5 transition">
          যোগাযোগ করুন
        </Link>
      </div>

      {/* Payment Request Form */}
      <PaymentRequestForm appName={app.name} amount={app.plans[0].price} />

      {/* Feedback Form */}
      <FeedbackForm appId={app.id} />



      {/* Screenshots and Version History */}
      <section className="mt-16 grid gap-10 border-t border-ink/10 dark:border-white/10 pt-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-2xl font-bold text-ink dark:text-white">স্ক্রিনশট</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(app.screenshots ?? ["ওয়ার্কস্পেস", "দ্রুত সেটআপ", "দৈনিক ভিউ"]).map((shot, index) => (
              <div
                key={shot}
                className="flex aspect-[4/3] items-end rounded-2xl bg-gradient-to-br from-primary/80 to-secondary/70 p-4 text-sm font-semibold text-white hover:shadow-lg transition"
              >
                <span>
                  0{index + 1} / {shot}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-ink dark:text-white">সংস্করণ ইতিহাস</h2>
          <div className="mt-5 space-y-4">
            {(app.versions ?? [{ version: "1.0.0", date: "Aug 2026", notes: "প্রাথমিক রিলিজ।" }]).map((version) => (
              <div key={version.version} className="border-l-2 border-primary pl-4">
                <p className="font-bold text-ink dark:text-white">
                  v{version.version} <span className="ml-2 text-xs font-medium text-ink/40 dark:text-white/40">{version.date}</span>
                </p>
                <p className="mt-1 text-sm text-ink/55 dark:text-white/55">{version.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
