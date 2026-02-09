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

  // ── Sheet 1: RESUMEN GENERAL ──
  const summaryData: any[] = [];

  // General stats
  summaryData.push({ Concepto: "RESUMEN GENERAL", Valor: "" });
  summaryData.push({ Concepto: "Total leads generados", Valor: leads.length });
  summaryData.push({ Concepto: "Leads nuevos", Valor: leads.filter((l) => l.status === "new").length });
  summaryData.push({ Concepto: "Leads contactados", Valor: leads.filter((l) => l.status === "contacted").length });
  summaryData.push({ Concepto: "Leads interesados", Valor: leads.filter((l) => l.status === "interested").length });
  summaryData.push({ Concepto: "Leads en negociacion", Valor: leads.filter((l) => l.status === "negotiating").length });
  summaryData.push({ Concepto: "Leads ganados", Valor: leads.filter((l) => l.status === "won").length });
  summaryData.push({ Concepto: "Leads perdidos/descartados", Valor: leads.filter((l) => l.status === "lost" || l.status === "discarded").length });
  const totalValue = leads.reduce((s, l) => s + (l.estimatedValue || 0), 0);
  summaryData.push({ Concepto: "Valor total pipeline", Valor: totalValue });
  summaryData.push({ Concepto: "Registros de actividad", Valor: logs.length });
  summaryData.push({ Concepto: "Tareas creadas", Valor: tasks.length });
  summaryData.push({ Concepto: "Acciones sobre leads", Valor: actions.length });
  summaryData.push({ Concepto: "", Valor: "" });

  // OKR summary
  summaryData.push({ Concepto: "OBJETIVOS (OKRs)", Valor: "" });
  for (const obj of objectives) {
    summaryData.push({
      Concepto: `${obj.agent?.name || "Equipo"}: ${obj.title}`,
      Valor: `${obj.progress}% (${obj.status})`,
    });
    for (const kr of obj.keyResults) {
      summaryData.push({
        Concepto: `  → ${kr.title}`,
        Valor: `${kr.currentValue}/${kr.targetValue} ${kr.unit}`,
      });
    }
  }
  summaryData.push({ Concepto: "", Valor: "" });

  // KPI summary
  summaryData.push({ Concepto: "KPIs POR AGENTE", Valor: "" });
  for (const k of kpis) {
    const pct = k.targetValue > 0 ? Math.round((k.currentValue / k.targetValue) * 100) : 0;
    summaryData.push({
      Concepto: `${k.agent?.name || ""}: ${k.name}`,
      Valor: `${k.currentValue}/${k.targetValue} ${k.unit} (${pct}%)`,
    });
  }

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

  // ── Sheet 2: ALL LEADS ──
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
  XLSX.utils.book_append_sheet(wb, wsLeads, "Todos los Leads");

  // ── One sheet PER AGENT with their leads, activity, KPIs, tasks ──
  for (const agent of agents) {
    const sheetData: any[] = [];

    // Agent info header
    const shortName = agent.name.split(" - ")[0];
    sheetData.push({ Seccion: `AGENTE: ${agent.name}`, Detalle: "", Extra: "" });
    sheetData.push({ Seccion: `Rol: ${agent.role}`, Detalle: agent.description, Extra: "" });
    sheetData.push({ Seccion: "", Detalle: "", Extra: "" });

    // Agent KPIs
    const agentKPIs = kpis.filter((k) => k.agent?.name === agent.name);
    if (agentKPIs.length > 0) {
      sheetData.push({ Seccion: "KPIs", Detalle: "Actual / Objetivo", Extra: "Cumplimiento" });
      for (const k of agentKPIs) {
        const pct = k.targetValue > 0 ? Math.round((k.currentValue / k.targetValue) * 100) : 0;
        sheetData.push({
          Seccion: k.name,
          Detalle: `${k.currentValue} / ${k.targetValue} ${k.unit}`,
          Extra: `${pct}%`,
        });
      }
      sheetData.push({ Seccion: "", Detalle: "", Extra: "" });
    }

    // Agent OKRs
    const agentOKRs = objectives.filter((o) => o.agent?.name === agent.name);
    if (agentOKRs.length > 0) {
      sheetData.push({ Seccion: "OBJETIVOS", Detalle: "Progreso", Extra: "Estado" });
      for (const obj of agentOKRs) {
        sheetData.push({ Seccion: obj.title, Detalle: `${obj.progress}%`, Extra: obj.status });
        for (const kr of obj.keyResults) {
          sheetData.push({
            Seccion: `  → ${kr.title}`,
            Detalle: `${kr.currentValue}/${kr.targetValue} ${kr.unit}`,
            Extra: `${kr.progress}%`,
          });
        }
      }
      sheetData.push({ Seccion: "", Detalle: "", Extra: "" });
    }

    // Agent leads (leads they created actions on)
    const agentActionLeadIds = new Set(
      actions.filter((a) => a.agent?.name === agent.name).map((a) => a.leadId)
    );
    const agentLeads = leads.filter((l) => agentActionLeadIds.has(l.id));
    if (agentLeads.length > 0) {
      sheetData.push({ Seccion: "LEADS TRABAJADOS", Detalle: "Estado", Extra: "Score" });
      for (const l of agentLeads) {
        sheetData.push({
          Seccion: `${l.companyName} (${l.contactName || "sin contacto"})`,
          Detalle: l.status,
          Extra: String(l.score),
        });
      }
      sheetData.push({ Seccion: "", Detalle: "", Extra: "" });
    }

    // Agent tasks
    const agentTasks = tasks.filter((t) => t.agent?.name === agent.name);
    if (agentTasks.length > 0) {
      sheetData.push({ Seccion: "TAREAS", Detalle: "Estado", Extra: "Prioridad" });
      for (const t of agentTasks) {
        sheetData.push({ Seccion: t.title, Detalle: t.status, Extra: t.priority });
      }
      sheetData.push({ Seccion: "", Detalle: "", Extra: "" });
    }

    // Agent activity (last 30)
    const agentLogs = logs.filter((l) => l.agent?.name === agent.name).slice(0, 30);
    if (agentLogs.length > 0) {
      sheetData.push({ Seccion: "ACTIVIDAD RECIENTE", Detalle: "Detalles", Extra: "Fecha" });
      for (const l of agentLogs) {
        sheetData.push({
          Seccion: l.action,
          Detalle: (l.details || "").slice(0, 200),
          Extra: l.createdAt.toISOString().replace("T", " ").slice(0, 19),
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 50 }, { wch: 40 }, { wch: 20 }];
    // Sheet name max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, shortName.slice(0, 31));
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="AgenteComercial_${date}.xlsx"`,
    },
  });
}
