import { NextResponse } from "next/server";

export function v1ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function v1err(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
