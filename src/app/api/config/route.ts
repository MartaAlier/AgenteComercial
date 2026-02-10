export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({ hasApiKey });
}
