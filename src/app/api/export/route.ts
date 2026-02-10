export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

function parseJSON(str: string | null): any[] {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

function leadToRow(l: any, idx: number) {
  const phones = parseJSON(l.phones);
  const emails = parseJSON(l.emails);
  const contacts = parseJSON(l.keyContacts);

  const contactsStr = contacts.map((c: any) =>
    `${c.name || "(cargo)"} (${c.position})${c.linkedin ? " - " + c.linkedin : ""}${c.phone ? " - " + c.phone : ""}${c.email ? " - " + c.email : ""}`
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
    "Fiabilidad": l.confidence === "high" ? "Alta" : l.confidence === "medium" ? "Media" : "Baja",
    "Lote": l.batch,
    "Estado": l.status,
  };
}

const COL_WIDTHS = [
  { wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 50 },
  { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 60 },
  { wch: 10 }, { wch: 6 }, { wch: 10 },
];

export async function GET() {
  const [leads, agents] = await Promise.all([
    prisma.lead.findMany({ orderBy: [{ batch: "asc" }, { companyName: "asc" }] }),
    prisma.agent.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Tab 1: GENERAL - all leads ──
  const generalData = leads.map((l, idx) => leadToRow(l, idx));
  const wsGeneral = XLSX.utils.json_to_sheet(generalData);
  wsGeneral["!cols"] = COL_WIDTHS;
  XLSX.utils.book_append_sheet(wb, wsGeneral, "General");

  // ── One tab per agent with full data ──
  for (const agent of agents) {
    const agentLeads = leads.filter((l) => l.source === agent.name);

    if (agentLeads.length === 0) continue;

    const sheetData = agentLeads.map((l, idx) => leadToRow(l, idx));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws["!cols"] = COL_WIDTHS;

    // Sheet name max 31 chars
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
