export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

function parseJSON(str: string | null): any[] {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

export async function GET() {
  const [leads, agents, logs] = await Promise.all([
    prisma.lead.findMany({ orderBy: [{ batch: "asc" }, { companyName: "asc" }] }),
    prisma.agent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.activityLog.findMany({
      include: { agent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Tab 1: GENERAL - all companies in Excel-like table ──
  const generalData = leads.map((l, idx) => {
    const phones = parseJSON(l.phones);
    const emails = parseJSON(l.emails);
    const contacts = parseJSON(l.keyContacts);

    const contactsStr = contacts.map((c: any) =>
      `${c.name} (${c.position})${c.linkedin ? " - " + c.linkedin : ""}${c.phone ? " - " + c.phone : ""}${c.email ? " - " + c.email : ""}`
    ).join("\n");

    return {
      "#": idx + 1,
      "Empresa": l.companyName,
      "Tipo de Empresa": l.companyType || "",
      "Direccion": l.address || "",
      "Google Maps": l.googleMapsUrl || "",
      "Descripcion": l.description || "",
      "Website": l.website || "",
      "Telefonos": phones.join(", "),
      "Emails": emails.join(", "),
      "Contactos Clave (LinkedIn)": contactsStr,
      "Lote": l.batch,
      "Estado": l.status,
    };
  });

  const wsGeneral = XLSX.utils.json_to_sheet(generalData);
  wsGeneral["!cols"] = [
    { wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 50 },
    { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 60 },
    { wch: 6 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGeneral, "General");

  // ── One tab per agent ──
  for (const agent of agents) {
    const agentLeads = leads.filter((l) => l.source === agent.name);
    const agentLogs = logs.filter((l) => l.agent?.name === agent.name);

    const sheetData: any[] = [];

    sheetData.push({ Col1: `AGENTE: ${agent.name}`, Col2: agent.description, Col3: "" });
    sheetData.push({ Col1: `Empresas encontradas: ${agentLeads.length}`, Col2: "", Col3: "" });
    sheetData.push({ Col1: "", Col2: "", Col3: "" });

    if (agentLeads.length > 0) {
      sheetData.push({ Col1: "EMPRESA", Col2: "TIPO", Col3: "DIRECCION" });
      for (const l of agentLeads) {
        sheetData.push({
          Col1: l.companyName,
          Col2: l.companyType || "",
          Col3: l.address || "",
        });
      }
      sheetData.push({ Col1: "", Col2: "", Col3: "" });
    }

    if (agentLogs.length > 0) {
      sheetData.push({ Col1: "ACTIVIDAD", Col2: "FECHA", Col3: "" });
      for (const l of agentLogs.slice(0, 20)) {
        sheetData.push({
          Col1: l.action,
          Col2: l.createdAt.toISOString().replace("T", " ").slice(0, 19),
          Col3: "",
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 50 }, { wch: 30 }, { wch: 40 }];
    const shortName = agent.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, shortName);
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
