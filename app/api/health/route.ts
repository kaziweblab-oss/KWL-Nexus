import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Free keep-alive endpoint — hit via cron/UptimeRobot every 5-10 min to keep Render backend active (prevent cold start)
// No auth, no DB, lightweight. Use: GET https://your-domain.vercel.app/api/health or /api/ping
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}
