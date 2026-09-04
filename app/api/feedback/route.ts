import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Feedback from "@/models/Feedback";

const feedbackSchema = z.object({ appId: z.string().min(1), type: z.enum(["bug_report", "suggestion", "feature_request", "rating"]), title: z.string().min(3).max(160), description: z.string().min(5).max(5000), screenshot: z.string().max(1500000).optional(), rating: z.number().min(1).max(5).optional() });

// Authenticated customers can submit one structured feedback item at a time.
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    let body: unknown;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid feedback", details: parsed.error.flatten() }, { status: 400 });
    await connectToDatabase();
    const feedback = await Feedback.create({ ...parsed.data, userId: auth.userId, status: "pending" });
    return NextResponse.json({ data: { id: feedback.id, status: feedback.status } }, { status: 201 });
  } catch (error) {
    console.error("Feedback POST failed:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

// The dashboard uses this user-scoped view to show replies and moderation status.
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiRequest(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    await connectToDatabase();
    const feedback = await Feedback.find({ userId: auth.userId }).populate("appId", "name slug").sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: feedback });
  } catch (error) {
    console.error("Feedback GET failed:", error);
    // Return JSON fallback to prevent Unexpected end of JSON input on client
    return NextResponse.json({ data: [], error: "Failed to load feedback" }, { status: 200 });
  }
}