import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";

export async function GET(request: Request) {
  const jwt = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof jwt?.email === "string" ? jwt.email : null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const users = await User.find({}, { name: 1, email: 1, role: 1, image: 1, phone: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ data: users });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load users" }, { status: 500 });
  }
}
