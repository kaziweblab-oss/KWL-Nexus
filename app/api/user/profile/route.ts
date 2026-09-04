import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";

// Return the authenticated user's public profile without password or secret fields.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const user = await User.findById(auth.userId).select("name email image role createdAt").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ data: user });
}
