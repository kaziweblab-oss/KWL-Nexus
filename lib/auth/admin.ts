// Admin access is deny-by-default. Two sources:
// 1) ADMIN_EMAILS env (bootstrap superadmins) — always superadmin, works in edge middleware without DB.
// 2) User.role in DB ("admin" | "superadmin") — managed via dashboard by superadmins.
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase()));
}

export function isSuperAdminEmail(email?: string | null) {
  // Env list is always superadmin
  return isAdminEmail(email);
}

// DB-backed checks (server only, requires Mongo)
export async function isAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  try {
    const { connectToDatabase } = await import("@/lib/db/connect");
    await connectToDatabase();
    const User = (await import("@/models/User")).default;
    const user = await User.findOne({ email: email.toLowerCase() }).select("role").lean();
    return user?.role === "admin" || user?.role === "superadmin";
  } catch {
    return false;
  }
}

export async function isSuperAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  try {
    const { connectToDatabase } = await import("@/lib/db/connect");
    await connectToDatabase();
    const User = (await import("@/models/User")).default;
    const user = await User.findOne({ email: email.toLowerCase() }).select("role").lean();
    return user?.role === "superadmin";
  } catch {
    return false;
  }
}

// Helper to ensure env superadmins are reflected in DB with correct role
export async function ensureSuperAdminInDb(email: string) {
  if (!isAdminEmail(email)) return;
  try {
    const { connectToDatabase } = await import("@/lib/db/connect");
    await connectToDatabase();
    const User = (await import("@/models/User")).default;
    const lower = email.toLowerCase();
    const existing = await User.findOne({ email: lower });
    if (!existing) {
      await User.create({ email: lower, name: lower.split("@")[0], role: "superadmin" });
    } else if (existing.role !== "superadmin") {
      existing.role = "superadmin";
      await existing.save();
    }
  } catch {
    // ignore DB errors in edge contexts
  }
}
