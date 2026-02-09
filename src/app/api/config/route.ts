export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  // Return API key from environment so the client doesn't need to configure it manually
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKey: apiKey,
  });
}
