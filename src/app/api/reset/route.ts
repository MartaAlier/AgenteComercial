export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AGENT_CONFIGS } from "@/lib/agents-config";

export async function POST() {
  try {
    // Delete all transactional data
    await prisma.leadAction.deleteMany();
    await prisma.scheduledCall.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.keyResult.deleteMany();
    await prisma.objective.deleteMany();
    await prisma.kPI.deleteMany();
    await prisma.agentTask.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.agent.deleteMany();

    // Recreate agents (they are structural, not demo data)
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

    // Create real OKRs for Q1 2026
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Team objective
    await prisma.objective.create({
      data: {
        agentId: null,
        title: "Generar pipeline cualificado de ventas para placas de yeso Q1 2026",
        description: "Objetivo principal del equipo: identificar, contactar y cualificar leads del sector de construcción en seco",
        quarter: "Q1-2026",
        progress: 0,
        status: "on_track",
        keyResults: {
          create: [
            { title: "Identificar 50 leads cualificados", targetValue: 50, currentValue: 0, unit: "leads", progress: 0 },
            { title: "Agendar 15 reuniones con el Director Comercial", targetValue: 15, currentValue: 0, unit: "reuniones", progress: 0 },
            { title: "Enviar 10 propuestas comerciales", targetValue: 10, currentValue: 0, unit: "propuestas", progress: 0 },
            { title: "Cerrar 3 acuerdos comerciales", targetValue: 3, currentValue: 0, unit: "acuerdos", progress: 0 },
          ],
        },
      },
    });

    // Individual OKRs and KPIs
    for (let i = 0; i < agents.length; i++) {
      const config = AGENT_CONFIGS[i];

      for (const objTitle of config.objectives) {
        await prisma.objective.create({
          data: {
            agentId: agents[i].id,
            title: objTitle,
            quarter: "Q1-2026",
            progress: 0,
            status: "on_track",
            keyResults: {
              create: [
                { title: `Completar ${objTitle}`, targetValue: 100, currentValue: 0, unit: "%", progress: 0 },
              ],
            },
          },
        });
      }

      for (const kpi of config.kpiTemplates) {
        await prisma.kPI.create({
          data: {
            agentId: agents[i].id,
            name: kpi.name,
            category: kpi.category,
            targetValue: kpi.target,
            currentValue: 0,
            unit: kpi.unit,
            period: "monthly",
            periodStart: monthStart,
            periodEnd: monthEnd,
          },
        });
      }
    }

    // Log the reset
    await prisma.activityLog.create({
      data: {
        agentId: agents[4].id, // Coordinadora
        category: "system",
        action: "Sistema inicializado - datos de demostración eliminados",
        details: "El sistema ha sido reseteado. Los agentes están listos para comenzar a operar con datos reales.",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sistema reseteado correctamente. Agentes listos para operar.",
      agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
