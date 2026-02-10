export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AGENT_CONFIGS } from "@/lib/agents-config";

export async function POST() {
  try {
    await prisma.leadAction.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.agent.deleteMany();

    const agents = [];
    for (const config of AGENT_CONFIGS) {
      const agent = await prisma.agent.create({
        data: {
          name: config.name,
          role: config.role,
          description: config.description,
          avatar: config.avatar,
          status: "active",
        },
      });
      agents.push(agent);
    }

    return NextResponse.json({
      success: true,
      message: "Sistema reseteado. Agentes listos.",
      agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
