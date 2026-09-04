import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";
import Notification from "@/models/Notification";
import { isSuperAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  try {
    await connectToDatabase();
  } catch {
    return session;
  }
  return session;
}

export async function PATCH(request: Request, { params }: { params: { email: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const email = decodeURIComponent(params.email).toLowerCase();
    const body = await request.json() as { role?: string; isBlocked?: boolean; blockedApps?: string[]; appId?: string; action?: string; reason?: string };
    const user = await User.findOne({ email });
    const adminEmail = (admin as unknown as { user?: { email?: string } })?.user?.email?.toLowerCase() ?? "";
    // demo fallback: if user not in DB (fallbackUsers), still handle role/block with notifications
    if (!user) {
      if (body.role && ["user", "admin", "superadmin"].includes(body.role)) {
        const isActorSuperDemo = await isSuperAdmin(adminEmail);
        if (!isActorSuperDemo) return NextResponse.json({ error: "Only superadmin can change roles" }, { status: 403 });
        const oldRole = "user";
        const newRole = body.role;
        const rank: Record<string, number> = { user: 0, admin: 1, superadmin: 2 };
        const isPromotion = (rank[newRole] ?? 0) > (rank[oldRole] ?? 0);
        const actorRoleName = isActorSuperDemo ? "superadmin" : "admin";
        await Notification.create({ email, title: isPromotion ? "Role promoted" : "Role demoted", message: isPromotion ? `You have been promoted from ${oldRole} to ${newRole} by ${actorRoleName}.` : `You have been demoted from ${oldRole} to ${newRole} by ${actorRoleName}.`, type: "general", read: false });
        if (adminEmail) {
          const adminUser = await User.findOne({ email: adminEmail }).lean() as { _id?: unknown } | null;
          await Notification.create({ userId: adminUser?._id as never, email: adminEmail, title: isPromotion ? "User promoted" : "User demoted", message: `${email} ${isPromotion ? "promoted" : "demoted"} from ${oldRole} to ${newRole} by ${actorRoleName}.`, type: "general", read: false });
        }
        return NextResponse.json({ data: { email, role: newRole } });
      }
      // for block demo, also notify with app name
      if (typeof body.isBlocked === "boolean" || (body.appId && body.action)) {
        const { apps: appCatalog } = await import("@/lib/data/apps");
        const displayName = body.appId ? (appCatalog.find((a) => a.id === body.appId)?.name ?? body.appId) : "All apps";
        const isBlock = body.isBlocked || body.action === "block";
        const title = isBlock ? (body.appId ? `Blocked from ${displayName}` : "Blocked from all apps") : (body.appId ? `Unblocked from ${displayName}` : "Account unblocked");
        const msg = body.reason?.trim() ? (isBlock ? `You have been blocked from ${displayName}: ${body.reason.trim()}` : `You have been unblocked from ${displayName}.`) : (isBlock ? (body.appId ? `You have been blocked from ${displayName} by admin.` : "Your account has been blocked from all apps by admin.") : (body.appId ? `You have been unblocked from ${displayName}.` : "You have been unblocked."));
        await Notification.create({ email, title, message: msg, type: isBlock ? "block" : "unblock", appId: body.appId ?? "all", appName: displayName, read: false });
        if (adminEmail) await Notification.create({ email: adminEmail, title: `${isBlock ? "Blocked" : "Unblocked"} ${email} ${body.appId ? `from ${displayName}` : "from all apps"}`, message: msg, type: "general", appId: body.appId ?? "all", appName: displayName, read: false });
        return NextResponse.json({ data: { email, isBlocked: body.isBlocked } });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // role change — only superadmin can promote/demote, with actor role in message
    if (body.role && ["user", "admin", "superadmin"].includes(body.role)) {
      const actorEmail = (admin as unknown as { user?: { email?: string } })?.user?.email?.toLowerCase() ?? "";
      const isActorSuper = await isSuperAdmin(actorEmail);
      if (!isActorSuper) return NextResponse.json({ error: "Only superadmin can change roles" }, { status: 403 });
      const oldRole = user.role as string;
      const newRole = body.role as string;
      const isChange = newRole !== oldRole;
      if (isChange) {
        const rank: Record<string, number> = { user: 0, admin: 1, superadmin: 2 };
        const isPromotion = (rank[newRole] ?? 0) > (rank[oldRole] ?? 0);
        // determine actor role name for "by {role}"
        const actorIsSuper = await isSuperAdmin(actorEmail);
        const actorRoleName = actorIsSuper ? "superadmin" : "admin";
        const titleTarget = isPromotion ? "Role promoted" : "Role demoted";
        const messageTarget = isPromotion
          ? `You have been promoted from ${oldRole} to ${newRole} by ${actorRoleName}.`
          : `You have been demoted from ${oldRole} to ${newRole} by ${actorRoleName}.`;
        const titleAdmin = isPromotion ? "User promoted" : "User demoted";
        const messageAdmin = `${user.name ?? user.email} promoted from ${oldRole} to ${newRole} by ${actorRoleName}.`;
        const messageAdminDemoted = `${user.name ?? user.email} demoted from ${oldRole} to ${newRole} by ${actorRoleName}.`;
        // notify target user
        await Notification.create({ userId: user._id, email: user.email, title: titleTarget, message: messageTarget, type: "general", read: false });
        // notify acting admin as well
        const adminUser = actorEmail ? await User.findOne({ email: actorEmail }).lean() as { _id?: unknown } | null : null;
        if (actorEmail) {
          await Notification.create({
            userId: adminUser?._id as never,
            email: actorEmail,
            title: titleAdmin,
            message: isPromotion ? messageAdmin : messageAdminDemoted,
            type: "general",
            read: false,
          });
        }
      }
      user.role = newRole as "user" | "admin" | "superadmin";
    }
    // block all
    if (typeof body.isBlocked === "boolean") {
      user.isBlocked = body.isBlocked;
      if (body.isBlocked) {
        await Subscription.updateMany({ userId: user._id, status: "active" }, { $set: { status: "cancelled", endsAt: new Date(), endDate: new Date() } });
        const blockMsg = body.reason?.trim() ? `You have been blocked from all apps: ${body.reason.trim()}` : "Your account has been blocked from all apps by admin.";
        await Notification.create({ userId: user._id, email: user.email, title: "Blocked from all apps", message: blockMsg, type: "block", appId: "all", appName: "All apps", read: false });
        if (adminEmail) {
          const adminUser = await User.findOne({ email: adminEmail }).lean() as { _id?: unknown } | null;
          await Notification.create({ userId: adminUser?._id as never, email: adminEmail, title: "Blocked user from all apps", message: `${user.email} blocked from all apps${body.reason?.trim() ? `: ${body.reason.trim()}` : ""}`, type: "general", appId: "all", appName: "All apps", read: false });
        }
      } else {
        await Notification.create({ userId: user._id, email: user.email, title: "Account unblocked", message: "Your account has been unblocked from all apps.", type: "unblock", appId: "all", appName: "All apps", read: false });
        if (adminEmail) {
          const adminUser = await User.findOne({ email: adminEmail }).lean() as { _id?: unknown } | null;
          await Notification.create({ userId: adminUser?._id as never, email: adminEmail, title: "Unblocked user", message: `${user.email} unblocked from all apps.`, type: "general", appId: "all", appName: "All apps", read: false });
        }
      }
    }
    // per-app block
    if (body.appId && body.action) {
      const updateBlocked = new Set(user.blockedApps ?? []);
      const { apps: appCatalog } = await import("@/lib/data/apps");
      const catalogApp = appCatalog.find((a) => a.id === body.appId);
      const displayName = catalogApp?.name ?? body.appId;
      if (body.action === "block") {
        updateBlocked.add(body.appId);
        const plans = await Plan.find({ $or: [{ appId: body.appId }, { appSlug: body.appId }] }).select("_id").lean<{ _id: unknown }[]>();
        const ids = plans.map((p) => p._id);
        if (ids.length) await Subscription.updateMany({ userId: user._id, planId: { $in: ids }, status: "active" }, { $set: { status: "cancelled", endsAt: new Date() } });
        const msg = body.reason?.trim() ? `You have been blocked from ${displayName} (${body.appId}): ${body.reason.trim()}` : `You have been blocked from ${displayName} by admin.`;
        await Notification.create({ userId: user._id, email: user.email, title: `Blocked from ${displayName}`, message: msg, type: "block", appId: body.appId, appName: displayName, read: false });
        if (adminEmail) {
          const adminUser = await User.findOne({ email: adminEmail }).lean() as { _id?: unknown } | null;
          await Notification.create({ userId: adminUser?._id as never, email: adminEmail, title: `Blocked ${user.email} from ${displayName}`, message: msg, type: "general", appId: body.appId, appName: displayName, read: false });
        }
      } else if (body.action === "unblock") {
        updateBlocked.delete(body.appId);
        await Notification.create({ userId: user._id, email: user.email, title: `Unblocked from ${displayName}`, message: `You have been unblocked from ${displayName}.`, type: "unblock", appId: body.appId, appName: displayName, read: false });
        if (adminEmail) {
          const adminUser = await User.findOne({ email: adminEmail }).lean() as { _id?: unknown } | null;
          await Notification.create({ userId: adminUser?._id as never, email: adminEmail, title: `Unblocked ${user.email}`, message: `You have been unblocked from ${displayName}.`, type: "general", appId: body.appId, appName: displayName, read: false });
        }
      }
      user.blockedApps = Array.from(updateBlocked);
    }
    if (Array.isArray(body.blockedApps)) {
      user.blockedApps = body.blockedApps;
    }

    await user.save();
    return NextResponse.json({ data: { email: user.email, role: user.role, isBlocked: user.isBlocked, blockedApps: user.blockedApps } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}

export async function GET(_: Request, { params }: { params: { email: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const email = decodeURIComponent(params.email).toLowerCase();
    const user = await User.findOne({ email }).lean() as { name: string; email: string; role: string; isBlocked?: boolean; blockedApps?: string[]; createdAt?: Date } | null;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
