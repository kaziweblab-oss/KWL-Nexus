import { NextResponse } from "next/server";
import { postmanCollection } from "@/lib/api/docs";

// Download a ready-to-import Postman collection.
export function GET() {
  return new NextResponse(JSON.stringify(postmanCollection, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=kwl-nexus.postman_collection.json" } });
}
