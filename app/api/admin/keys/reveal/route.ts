import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import ApiKey from "@/models/ApiKey";
import { decryptApiKeySecret } from "@/lib/api/auth";

// Admin-only reveal of the secret key (decrypted on demand, never stored or logged in plaintext).
// Keys generated before reveal support have no keyEnc and return 404 — regenerate those.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Key id is required" }, { status: 400 });
  await connectToDatabase();
  const User = (await import("@/models/User")).default;
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const record = await ApiKey.findOne({ _id: id, userId: user._id }).select("+keyEnc name isRevoked").lean() as unknown as { _id: unknown; name?: string; isRevoked?: boolean; keyEnc?: string } | null;
  if (!record?.keyEnc) {
    return NextResponse.json({ error: "Secret not available for this key (generated before reveal support). Revoke it and generate a new key." }, { status: 404 });
  }
  try {
    const key = decryptApiKeySecret(record.keyEnc);
    return NextResponse.json({ data: { id: String(record._id), name: record.name, key } });
  } catch {
    return NextResponse.json({ error: "Unable to decrypt this key." }, { status: 500 });
  }
}
