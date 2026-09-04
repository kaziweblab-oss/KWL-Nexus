"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <html lang="en">
      <body className="antialiased">
        <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-20 text-center">
          <div className="rounded-[2rem] border border-ink/10 bg-white p-10 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Something went wrong</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">We hit a snag.</h1>
            <p className="mt-3 text-ink/60">An unexpected error occurred. Please refresh.</p>
            <button onClick={() => reset()} className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
