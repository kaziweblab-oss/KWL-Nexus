"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-20 text-center">
      <div className="rounded-[2rem] border border-ink/10 bg-white p-10 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Something went wrong</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink dark:text-white">We hit a snag.</h1>
        <p className="mt-3 text-ink/60 dark:text-white/60">Please retry the action or return to the store home.</p>
        {error?.digest && <p className="mt-2 text-xs text-ink/40">Error ID: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => reset()} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">Try again</button>
          <a href="/" className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">Go home</a>
        </div>
      </div>
    </main>
  );
}
