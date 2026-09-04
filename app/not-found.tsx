import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-20 text-center">
      <div className="rounded-[2rem] border border-ink/10 bg-white p-10 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">404</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">This page has drifted away.</h1>
        <p className="mt-3 text-ink/60">The link you followed may be outdated, or the content simply moved.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">Return home</Link>
      </div>
    </main>
  );
}
