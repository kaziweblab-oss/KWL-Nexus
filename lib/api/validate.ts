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
