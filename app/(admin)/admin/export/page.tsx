import { AppExportTools } from "@/components/shared/AppExportTools";

export default function AdminExportPage() {
  return (
    <main>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Data management</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">Export center</h1>
      <p className="mt-2 text-ink/55">Download users, payments, and feedback in CSV or JSON format.</p>
      <div className="mt-8">
        <AppExportTools />
      </div>
    </main>
  );
}
