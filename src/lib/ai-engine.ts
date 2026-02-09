import prisma from "@/lib/prisma";

const SYSTEM_PROMPTS: Record<string, string> = {
  INVESTIGADOR_MERCADO: `Eres Ana, investigadora de mercado especializada en el sector de materiales de construcción, específicamente placas de yeso laminado (marcas como Pladur, Knauf, Placo/Saint-Gobain).

Tu trabajo es:
- Investigar el mercado de placas de yeso en España
- Identificar empresas potenciales clientes: constructoras, distribuidores, instaladores, arquitectos, reformistas, promotores inmobiliarios
- Analizar segmentos del mercado con mayor potencial
- Estudiar tendencias y oportunidades
- Generar informes de inteligencia comercial

Cuando generes leads, incluye información realista y específica del sector español de construcción en seco.
Responde siempre en español. Sé específico con nombres de empresas, regiones, y datos del sector.`,

  ESPECIALISTA_PRODUCTO: `Eres Carlos, especialista técnico en placas de yeso laminado.

Tu expertise incluye:
- Placas estándar, hidrófugas (H1), ignífugas (F), acústicas, de alta dureza (I)
- Sistemas constructivos: tabiques, trasdosados, techos
- Marcas: Pladur, Knauf, Placo (Saint-Gobain), Fermacell
- Normativa técnica: CTE, marcado CE, Euroclases de fuego
- Especificaciones: espesores (10, 13, 15, 18mm), pesos, resistencias

Tu trabajo es:
- Preparar argumentarios técnicos de venta
- Responder consultas técnicas
- Crear comparativas de productos
- Adaptar las especificaciones a las necesidades de cada lead

Responde siempre en español con precisión técnica.`,

  DESARROLLADOR_MERCADO: `Eres María, desarrolladora de mercado para placas de yeso laminado en España.

Tu trabajo es:
- Identificar nuevos canales de distribución
- Desarrollar estrategias de penetración regional
- Establecer alianzas con instaladores y distribuidores
- Diseñar planes de acción comercial
- Mapear la cadena de valor del sector

Conoces bien la geografía comercial de España: clusters de construcción, polígonos industriales, ferias del sector (Construmat, Construtec, Cevisama), asociaciones (ATEDY, ANFAPA).

Responde siempre en español. Propón acciones concretas y medibles.`,

  COMERCIAL: `Eres Pedro, comercial senior especializado en venta B2B de materiales de construcción.

Tu trabajo es:
- Contactar leads y cualificar su potencial
- Gestionar el pipeline de ventas
- Preparar propuestas comerciales
- Negociar condiciones
- Hacer seguimiento de oportunidades
Eres experto en técnicas de venta consultiva, BANT (Budget, Authority, Need, Timeline), y cierre.
Cuando evalúes un lead, asigna un score de 0-100 basado en su potencial real.

Responde siempre en español. Sé directo y orientado a resultados.`,

  COORDINADOR: `Eres Laura, coordinadora del equipo de agentes de ventas de placas de yeso.

Tu trabajo es:
- Analizar el estado actual del pipeline y los KPIs
- Identificar prioridades y asignar tareas
- Detectar cuellos de botella
- Proponer acciones para mejorar el rendimiento
- Preparar informes para el Director Comercial
Tienes visión global del equipo y sus objetivos (OKRs). Tu enfoque es operativo y orientado a resultados.

Responde siempre en español. Sé concreta y ejecutiva.`,
};

interface AgentAction {
  type: "new_lead" | "update_lead" | "log" | "task";
  data: any;
}

interface AgentResponse {
  thinking: string;
  actions: AgentAction[];
  summary: string;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

function parseAgentResponse(text: string): AgentResponse {
  // Try to parse structured JSON response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Fall through to text parsing
    }
  }

  // Try direct JSON parse
  try {
    return JSON.parse(text);
  } catch {
    // Return as plain text summary
    return {
      thinking: "",
      actions: [
        {
          type: "log",
          data: {
            action: text.slice(0, 200),
            details: text,
            category: "analysis",
          },
        },
      ],
      summary: text.slice(0, 500),
    };
  }
}

async function getAgentContext(agentId: string, _role: string) {
  const [leads, recentLogs, tasks, kpis, objectives] = await Promise.all([
    prisma.lead.findMany({
      where: { status: { notIn: ["won", "lost", "discarded"] } },
      include: {
        actions: { orderBy: { createdAt: "desc" }, take: 3 },
        _count: { select: { actions: true } },
      },
      orderBy: { score: "desc" },
    }),
    prisma.activityLog.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.agentTask.findMany({
      where: { agentId, status: { in: ["pending", "in_progress"] } },
    }),
    prisma.kPI.findMany({ where: { agentId } }),
    prisma.objective.findMany({
      where: { OR: [{ agentId }, { agentId: null }] },
      include: { keyResults: true },
    }),
  ]);

  return {
    leads: leads.map((l) => ({
      id: l.id,
      company: l.companyName,
      contact: l.contactName,
      email: l.contactEmail,
      phone: l.contactPhone,
      position: l.position,
      industry: l.industry,
      segment: l.segment,
      region: l.region,
      status: l.status,
      score: l.score,
      priority: l.priority,
      source: l.source,
      estimatedValue: l.estimatedValue,
      actionCount: l._count.actions,
      lastActions: l.actions.map((a) => ({
        type: a.type,
        summary: a.summary,
        date: a.createdAt,
      })),
    })),
    recentActivity: recentLogs.map((l) => ({
      action: l.action,
      category: l.category,
      date: l.createdAt,
    })),
    pendingTasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
    })),
    kpis: kpis.map((k) => ({
      name: k.name,
      current: k.currentValue,
      target: k.targetValue,
      unit: k.unit,
    })),
    objectives: objectives.map((o) => ({
      title: o.title,
      progress: o.progress,
      status: o.status,
      keyResults: o.keyResults.map((kr) => ({
        title: kr.title,
        current: kr.currentValue,
        target: kr.targetValue,
        unit: kr.unit,
      })),
    })),
  };
}

export async function executeAgent(
  agentId: string,
  apiKey: string,
  customInstruction?: string
) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error("Agent not found");

  const systemPrompt = SYSTEM_PROMPTS[agent.role];
  if (!systemPrompt) throw new Error(`No prompt for role: ${agent.role}`);

  const context = await getAgentContext(agentId, agent.role);

  const userPrompt = `${customInstruction ? `INSTRUCCIÓN DEL DIRECTOR COMERCIAL: ${customInstruction}\n\n` : ""}CONTEXTO ACTUAL DEL PIPELINE:
- Leads activos: ${context.leads.length}
- Leads en pipeline: ${JSON.stringify(context.leads.slice(0, 15), null, 2)}

TUS KPIs ACTUALES:
${JSON.stringify(context.kpis, null, 2)}

TUS OBJETIVOS (OKRs):
${JSON.stringify(context.objectives, null, 2)}

TUS TAREAS PENDIENTES:
${JSON.stringify(context.pendingTasks, null, 2)}

TU ACTIVIDAD RECIENTE:
${JSON.stringify(context.recentActivity, null, 2)}

INSTRUCCIONES:
Analiza la situación actual y decide qué acciones tomar para avanzar hacia los objetivos.
Responde en JSON con este formato exacto:
\`\`\`json
{
  "thinking": "Tu análisis de la situación y razonamiento",
  "actions": [
    {
      "type": "new_lead",
      "data": {
        "companyName": "...", "contactName": "...", "contactEmail": "...",
        "contactPhone": "...", "position": "...", "industry": "...",
        "segment": "...", "region": "...", "source": "...",
        "priority": "low|medium|high|urgent", "score": 0-100,
        "estimatedValue": 0, "notes": "..."
      }
    },
    {
      "type": "update_lead",
      "data": {
        "leadId": "id del lead existente",
        "status": "nuevo status",
        "score": "nuevo score",
        "notes": "notas adicionales"
      }
    },
    {
      "type": "log",
      "data": {
        "category": "research|outreach|analysis|planning|reporting",
        "action": "Descripción corta de la acción",
        "details": "Detalles completos"
      }
    },
    {
      "type": "task",
      "data": {
        "title": "Título de la tarea",
        "description": "Descripción",
        "priority": "low|medium|high|urgent"
      }
    }
  ],
  "summary": "Resumen ejecutivo de lo que hiciste y por qué"
}
\`\`\`

Genera entre 2 y 6 acciones relevantes para tu rol. Sé específico y realista.`;

  const responseText = await callClaude(apiKey, systemPrompt, userPrompt);
  const parsed = parseAgentResponse(responseText);

  // Execute actions
  const results = [];
  for (const action of parsed.actions) {
    try {
      switch (action.type) {
        case "new_lead": {
          const lead = await prisma.lead.create({
            data: {
              companyName: action.data.companyName,
              contactName: action.data.contactName || null,
              contactEmail: action.data.contactEmail || null,
              contactPhone: action.data.contactPhone || null,
              position: action.data.position || null,
              industry: action.data.industry || null,
              segment: action.data.segment || null,
              region: action.data.region || null,
              source: action.data.source || `Agente: ${agent.name}`,
              status: "new",
              priority: action.data.priority || "medium",
              score: action.data.score || 50,
              estimatedValue: action.data.estimatedValue || null,
              notes: action.data.notes || null,
            },
          });
          await prisma.leadAction.create({
            data: {
              leadId: lead.id,
              agentId: agent.id,
              type: "research",
              summary: `Lead identificado: ${action.data.companyName}`,
              details: action.data.notes,
              result: "positive",
            },
          });
          results.push({ type: "new_lead", success: true, leadId: lead.id });
          break;
        }

        case "update_lead": {
          if (action.data.leadId) {
            const updateData: any = {};
            if (action.data.status) updateData.status = action.data.status;
            if (action.data.score) updateData.score = action.data.score;
            if (action.data.notes) updateData.notes = action.data.notes;
            if (action.data.priority) updateData.priority = action.data.priority;

            await prisma.lead.update({
              where: { id: action.data.leadId },
              data: updateData,
            });
            await prisma.leadAction.create({
              data: {
                leadId: action.data.leadId,
                agentId: agent.id,
                type: "status_change",
                summary: `Actualización: ${action.data.notes || action.data.status || "Datos actualizados"}`,
                result: "neutral",
              },
            });
            results.push({ type: "update_lead", success: true });
          }
          break;
        }

        case "log": {
          await prisma.activityLog.create({
            data: {
              agentId: agent.id,
              category: action.data.category || "analysis",
              action: action.data.action,
              details: action.data.details,
            },
          });
          results.push({ type: "log", success: true });
          break;
        }

        case "task": {
          await prisma.agentTask.create({
            data: {
              agentId: agent.id,
              title: action.data.title,
              description: action.data.description,
              priority: action.data.priority || "medium",
              status: "pending",
            },
          });
          results.push({ type: "task", success: true });
          break;
        }
      }
    } catch (err) {
      results.push({ type: action.type, success: false, error: String(err) });
    }
  }

  // Log the execution summary
  await prisma.activityLog.create({
    data: {
      agentId: agent.id,
      category: "system",
      action: `Ciclo de trabajo completado: ${results.filter((r) => r.success).length}/${results.length} acciones ejecutadas`,
      details: parsed.summary,
      metadata: JSON.stringify({ thinking: parsed.thinking, results }),
    },
  });

  // Update KPIs based on actions
  await updateKPIs(agent.id, agent.role, results);

  return {
    agent: { id: agent.id, name: agent.name, role: agent.role },
    thinking: parsed.thinking,
    summary: parsed.summary,
    actions: results,
  };
}

async function updateKPIs(agentId: string, role: string, results: any[]) {
  const kpis = await prisma.kPI.findMany({ where: { agentId } });

  for (const kpi of kpis) {
    let increment = 0;

    if (kpi.name.toLowerCase().includes("informe") || kpi.name.toLowerCase().includes("report")) {
      increment = results.filter((r) => r.type === "log" && r.success).length;
    } else if (kpi.name.toLowerCase().includes("lead") || kpi.name.toLowerCase().includes("oportunidad")) {
      increment = results.filter((r) => r.type === "new_lead" && r.success).length;
    } else if (kpi.name.toLowerCase().includes("contacta") || kpi.name.toLowerCase().includes("propuesta")) {
      increment = results.filter((r) => r.type === "update_lead" && r.success).length;
    } else if (kpi.name.toLowerCase().includes("tarea")) {
      increment = results.filter((r) => r.success).length;
    }

    if (increment > 0) {
      await prisma.kPI.update({
        where: { id: kpi.id },
        data: { currentValue: { increment } },
      });
    }
  }
}

export async function updateOKRProgress() {
  // Update team objective key results based on actual data
  const teamObjective = await prisma.objective.findFirst({
    where: { agentId: null, quarter: "Q1-2026" },
    include: { keyResults: true },
  });

  if (teamObjective) {
    const [totalLeads, contactedLeads, proposalActions, wonLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: { in: ["contacted", "interested", "negotiating", "won"] } } }),
      prisma.leadAction.count({ where: { type: { in: ["meeting", "qualification"] } } }),
      prisma.lead.count({ where: { status: "won" } }),
    ]);

    for (const kr of teamObjective.keyResults) {
      let newValue = 0;
      if (kr.unit === "leads") newValue = Math.min(totalLeads, kr.targetValue);
      else if (kr.unit === "reuniones") newValue = Math.min(contactedLeads, kr.targetValue);
      else if (kr.unit === "propuestas") newValue = Math.min(proposalActions, kr.targetValue);
      else if (kr.unit === "acuerdos") newValue = Math.min(wonLeads, kr.targetValue);

      const progress = kr.targetValue > 0 ? Math.round((newValue / kr.targetValue) * 100) : 0;
      await prisma.keyResult.update({
        where: { id: kr.id },
        data: { currentValue: newValue, progress },
      });
    }

    // Update objective progress as average of key results
    const updatedKRs = await prisma.keyResult.findMany({ where: { objectiveId: teamObjective.id } });
    const avgProgress = updatedKRs.length > 0
      ? Math.round(updatedKRs.reduce((sum, kr) => sum + kr.progress, 0) / updatedKRs.length)
      : 0;

    await prisma.objective.update({
      where: { id: teamObjective.id },
      data: {
        progress: avgProgress,
        status: avgProgress >= 100 ? "completed" : avgProgress >= 70 ? "on_track" : avgProgress >= 40 ? "at_risk" : "behind",
      },
    });
  }

  // Update individual agent objectives based on KPI achievement
  const agentObjectives = await prisma.objective.findMany({
    where: { agentId: { not: null }, quarter: "Q1-2026" },
    include: { keyResults: true },
  });

  for (const obj of agentObjectives) {
    if (!obj.agentId) continue;

    const agentKPIs = await prisma.kPI.findMany({ where: { agentId: obj.agentId } });
    const avgKPIProgress = agentKPIs.length > 0
      ? Math.round(
          agentKPIs.reduce((sum, k) => sum + (k.targetValue > 0 ? Math.min((k.currentValue / k.targetValue) * 100, 100) : 0), 0)
          / agentKPIs.length
        )
      : 0;

    // Update key results for this objective
    for (const kr of obj.keyResults) {
      if (kr.unit === "%") {
        await prisma.keyResult.update({
          where: { id: kr.id },
          data: { currentValue: avgKPIProgress, progress: avgKPIProgress },
        });
      }
    }

    await prisma.objective.update({
      where: { id: obj.id },
      data: {
        progress: avgKPIProgress,
        status: avgKPIProgress >= 100 ? "completed" : avgKPIProgress >= 70 ? "on_track" : avgKPIProgress >= 40 ? "at_risk" : "behind",
      },
    });
  }

  // Return overall completion status
  const allObjectives = await prisma.objective.findMany({
    where: { quarter: "Q1-2026" },
    select: { progress: true, status: true },
  });

  const avgProgress = allObjectives.length > 0
    ? Math.round(allObjectives.reduce((sum, o) => sum + o.progress, 0) / allObjectives.length)
    : 0;

  const allComplete = allObjectives.every((o) => o.status === "completed");

  return { avgProgress, allComplete, totalObjectives: allObjectives.length };
}

export async function executeAllAgents(apiKey: string, customInstruction?: string) {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const agent of agents) {
    try {
      const result = await executeAgent(agent.id, apiKey, customInstruction);
      results.push(result);
    } catch (err) {
      results.push({
        agent: { id: agent.id, name: agent.name, role: agent.role },
        error: String(err),
      });
    }
  }

  return results;
}
