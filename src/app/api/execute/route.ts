export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { executeAgent, executeAllAgents } from "@/lib/ai-engine";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, agentId, instruction } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "Se requiere la API key de Anthropic (Claude)" },
        { status: 400 }
      );
    }

    let results;
    if (agentId) {
      // Execute single agent
      const result = await executeAgent(agentId, apiKey, instruction);
      results = [result];
    } else {
      // Execute all agents
      results = await executeAllAgents(apiKey, instruction);
    }

    return NextResponse.json({
      success: true,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
