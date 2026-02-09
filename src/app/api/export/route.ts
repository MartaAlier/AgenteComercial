export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const [leads, agents, logs, objectives, kpis, tasks, actions] = await Promise.all([
    prisma.lead.findMany({ orderBy: { score: "desc" } }),
    prisma.agent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.activityLog.findMany({
      include: { agent: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.objective.findMany({
      include: {
        keyResults: true,
        agent: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.kPI.findMany({
      include: { agent: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentTask.findMany({
      include: { agent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leadAction.findMany({
      include: {
        lead: { select: { companyName: true } },
        agent: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Leads
  const leadsData = leads.map((l) => ({
    Empresa: l.companyName,
    Contacto: l.contactName || "",
    Email: l.contactEmail || "",
    Telefono: l.contactPhone || "",
    Cargo: l.position || "",
    Industria: l.industry || "",
    Segmento: l.segment || "",
    Region: l.region || "",
    Fuente: l.source || "",
    Estado: l.status,
    Prioridad: l.priority,
    Score: l.score,
    "Valor Estimado": l.estimatedValue || 0,
    Notas: l.notes || "",
    "Fecha Creacion": l.createdAt.toISOString().split("T")[0],
  }));
  const wsLeads = XLSX.utils.json_to_sheet(leadsData);
  XLSX.utils.book_append_sheet(wb, wsLeads, "Leads");

  // Sheet 2: Agentes
  const agentsData = agents.map((a) => ({
    Nombre: a.name,
    Rol: a.role,
    Estado: a.status,
    Descripcion: a.description,
  }));
  const wsAgents = XLSX.utils.json_to_sheet(agentsData);
  XLSX.utils.book_append_sheet(wb, wsAgents, "Agentes");

  // Sheet 3: Actividad
  const logsData = logs.map((l) => ({
    Agente: l.agent?.name || "",
    Categoria: l.category,
    Accion: l.action,
    Detalles: l.details || "",
    Fecha: l.createdAt.toISOString().replace("T", " ").slice(0, 19),
  }));
  const wsLogs = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, wsLogs, "Actividad");

  // Sheet 4: OKRs
  const okrsData: any[] = [];
  objectives.forEach((obj) => {
    okrsData.push({
      Tipo: obj.agentId ? "Individual" : "Equipo",
      Agente: obj.agent?.name || "Todo el equipo",
      Objetivo: obj.title,
      Trimestre: obj.quarter,
      Progreso: `${obj.progress}%`,
      Estado: obj.status,
    });
    obj.keyResults.forEach((kr) => {
      okrsData.push({
        Tipo: "Key Result",
        Agente: obj.agent?.name || "Todo el equipo",
        Objetivo: `  → ${kr.title}`,
        Trimestre: "",
        Progreso: `${kr.currentValue}/${kr.targetValue} ${kr.unit}`,
        Estado: `${kr.progress}%`,
      });
    });
  });
  const wsOkrs = XLSX.utils.json_to_sheet(okrsData);
  XLSX.utils.book_append_sheet(wb, wsOkrs, "OKRs");

  // Sheet 5: KPIs
  const kpisData = kpis.map((k) => ({
    Agente: k.agent?.name || "",
    KPI: k.name,
    Categoria: k.category,
    Actual: k.currentValue,
    Objetivo: k.targetValue,
    Unidad: k.unit,
    "Cumplimiento %": k.targetValue > 0 ? Math.round((k.currentValue / k.targetValue) * 100) : 0,
    Periodo: k.period,
  }));
  const wsKpis = XLSX.utils.json_to_sheet(kpisData);
  XLSX.utils.book_append_sheet(wb, wsKpis, "KPIs");

  // Sheet 6: Tareas
  const tasksData = tasks.map((t) => ({
    Agente: t.agent?.name || "",
    Tarea: t.title,
    Descripcion: t.description || "",
    Estado: t.status,
    Prioridad: t.priority,
    "Fecha Creacion": t.createdAt.toISOString().split("T")[0],
    "Fecha Completado": t.completedAt ? t.completedAt.toISOString().split("T")[0] : "",
  }));
  const wsTasks = XLSX.utils.json_to_sheet(tasksData);
  XLSX.utils.book_append_sheet(wb, wsTasks, "Tareas");

  // Sheet 7: Acciones sobre leads
  const actionsData = actions.map((a) => ({
    Empresa: a.lead?.companyName || "",
    Agente: a.agent?.name || "",
    Tipo: a.type,
    Resumen: a.summary,
    Resultado: a.result || "",
    Detalles: a.details || "",
    Fecha: a.createdAt.toISOString().replace("T", " ").slice(0, 19),
  }));
  const wsActions = XLSX.utils.json_to_sheet(actionsData);
  XLSX.utils.book_append_sheet(wb, wsActions, "Acciones Leads");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="AgenteComercial_${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}
