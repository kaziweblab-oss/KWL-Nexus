import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Feedback from "@/models/Feedback";

export const dynamic = "force-dynamic";

const exportSchema = z.object({
  type: z.enum(["users", "payments", "feedback"]),
  format: z.enum(["json", "csv"]).default("json"),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  await connectToDatabase();
  return true;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const rowsCsv = rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","));
  return [headers.join(","), ...rowsCsv].join("\n");
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const url = new URL(request.url);
  const parsed = exportSchema.safeParse({
    type: url.searchParams.get("type"),
    format: url.searchParams.get("format") ?? "json",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, format } = parsed.data;
  let data: Record<string, unknown>[] = [];

  if (type === "users") data = await User.find({}).lean();
  if (type === "payments") data = await Payment.find({}).populate("userId", "name email").lean();
  if (type === "feedback") data = await Feedback.find({}).populate("appId", "name").populate("userId", "name email").lean();

  if (format === "csv") {
    const csv = toCsv(data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify({ data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.json"`,
    },
  });
}
