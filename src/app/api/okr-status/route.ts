export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { updateOKRProgress } from "@/lib/ai-engine";

export async function GET() {
  try {
    const status = await updateOKRProgress();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
