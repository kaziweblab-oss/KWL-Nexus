import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import ContactConfig from "@/models/ContactConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectToDatabase();
  const contacts = await ContactConfig.find().sort({ order: 1, createdAt: 1 }).lean();
  const activeContacts = contacts.filter((contact) => contact.isActive !== false);
  return NextResponse.json({ data: activeContacts });
}
