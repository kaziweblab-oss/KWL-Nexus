export function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-5 w-32 animate-pulse rounded-full bg-ink/10" />
      <div className="h-10 w-72 animate-pulse rounded-full bg-ink/10" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl bg-ink/10" />
        ))}
      </div>
    </div>
  );
}
