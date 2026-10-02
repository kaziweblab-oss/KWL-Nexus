import { logEvent } from "@/lib/observability/log";

// Best-effort audit record. Never throws — observability must not break business flows.
// Fields carry ids/slugs/statuses only, never secrets.
export async function recordAudit(action: string, actor?: string | null, target?: string | null, meta?: Record<string, string | number | boolean | null | undefined> | null) {
  try {
    const AuditLog = (await import("@/models/AuditLog")).default;
    await AuditLog.create({ actor: actor ?? null, action, target: target ?? null, meta: meta ?? null });
  } catch (error) {
    logEvent("audit:error", "audit record failed", { action });
    void error;
  }
}
