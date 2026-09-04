import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/api/docs";

// Machine-readable OpenAPI output for API clients and tooling.
export function GET() {
  return NextResponse.json(openApiDocument);
}
