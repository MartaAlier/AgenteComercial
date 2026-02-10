export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ensureAgentsExist } from "@/lib/ai-engine";

export async function POST() {
  try {
    await ensureAgentsExist();
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    return NextResponse.json({ success: true, hasApiKey });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
