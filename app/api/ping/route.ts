import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Alias for /api/health — some uptime monitors prefer /api/ping
export async function GET() {
  return NextResponse.json({ status: "ok", ping: "pong", timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
