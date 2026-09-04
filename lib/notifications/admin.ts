import Notification from "@/models/Notification";
import User from "@/models/User";

export async function notifyAdmins(title: string, message: string, type: "general" | "payment" | "integration" = "general", integrationId?: string, paymentMethodId?: string) {
  try {
    const users = await User.find({ role: { $in: ["admin", "superadmin"] } }).select("email").lean();
    const emails = new Set(users.map((user) => user.email).filter(Boolean));
    for (const email of (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)) emails.add(email);
    if (emails.size) {
      const docs = Array.from(emails).map((email) => ({ email, title, message, type, integrationId, paymentMethodId: paymentMethodId ? paymentMethodId : undefined }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (Notification as unknown as { insertMany: (docs: unknown[]) => Promise<void> }).insertMany(docs as unknown[]);
    }
  } catch {
    // Notifications must never make the original admin action fail.
  }
}