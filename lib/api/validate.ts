import mongoose from "mongoose";
import { NextResponse } from "next/server";

// Shared input + error hygiene for API routes.
export function isValidId(id: string | null | undefined): boolean {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

export function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid id" }, { status: 400 });
}

// Never leak raw database errors (collection names, query shapes) to clients.
export function dbErrorResponse(error: unknown, context: string) {
  console.error(`${context}:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Database unavailable. Please try again later." }, { status: 500 });
}

// Bound admin/user list endpoints (?limit=, default 200, max 500) so no route can
// pull an unbounded collection into one serverless response. Shape unchanged.
export function cappedLimit(req: Request, def = 200, max = 500): number {
  try {
    const n = Number(new URL(req.url).searchParams.get("limit") ?? def);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(1, Math.floor(n)));
  } catch {
    return def;
  }
}
