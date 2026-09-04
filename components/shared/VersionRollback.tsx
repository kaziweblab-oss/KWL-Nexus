"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

export function VersionRollback({ appId, versions }: { appId: string; versions: { version: string; date: string; notes: string }[] }) {
  const [selectedVersion, setSelectedVersion] = useState(versions[0]?.version ?? "");
  const [confirming, setConfirming] = useState(false);

  async function rollback() {
    const response = await fetch(`/api/admin/apps/${appId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollbackTo: selectedVersion, version: selectedVersion, notes: `Rolled back to ${selectedVersion}` }),
    });

    if (response.ok) {
      setConfirming(false);
      window.location.reload();
    }
  }

  if (!versions.length) return null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="flex items-center gap-3">
        <RotateCcw className="text-primary" size={18} />
        <h2 className="font-bold text-ink">Version rollback</h2>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-semibold text-ink/60">
          Select version
          <div className="mt-2">
            <CustomSelect value={selectedVersion} options={versions.map((v) => v.version)} onChange={setSelectedVersion} />
          </div>
        </label>
        <button onClick={() => setConfirming(true)} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">Rollback</button>
      </div>

      {confirming && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-700">Confirm rollback to v{selectedVersion}?</p>
          <div className="mt-3 flex gap-3">
            <button onClick={() => void rollback()} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Confirm</button>
            <button onClick={() => setConfirming(false)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
