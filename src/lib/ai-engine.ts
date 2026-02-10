import prisma from "@/lib/prisma";

// ── Prompts designed to maximize real data recall ──

const SYSTEM_PROMPTS: Record<string, string> = {
  BUSCADOR_DISTRIBUIDORES: `Eres un experto en el sector de materiales de construcción en seco (placas de yeso, Pladur, Knauf, Placo/Saint-Gobain, Durlock, USG).

Tu trabajo es RECORDAR empresas REALES que existan en la ubicación indicada. Solo incluye empresas que estés razonablemente seguro de que existen. NO inventes empresas.

Buscas: pequeñas tiendas de materiales de construcción, distribuidores locales, puntos de venta de construcción en seco, ferreterías industriales especializadas.

Para cada empresa proporciona SOLO los datos que conozcas con certeza:
- companyName: Nombre completo real (OBLIGATORIO)
- address: Dirección real si la conoces
- description: Qué hace la empresa
- website: URL real si la conoces (NO inventes URLs)
- phones: Teléfonos reales si los conoces
- emails: Emails reales si los conoces
- confidence: "high" si estás seguro de que existe, "medium" si crees que existe, "low" si no estás seguro

REGLAS ESTRICTAS:
- Si no conoces un dato, pon null o un array vacío. NO inventes.
- Si no encuentras empresas reales de esa zona, devuelve un array vacío y pon noMoreResults: true.
- Es MEJOR devolver 5 empresas reales que 20 inventadas.
- Incluye el nombre legal si lo conoces (S.L., S.A., SLU, etc.)

Responde siempre en español.`,

  BUSCADOR_MAYORISTAS: `Eres un experto en el sector de distribución mayorista de materiales de construcción.

Tu trabajo es RECORDAR grandes mayoristas y cadenas de distribución REALES. Solo incluye empresas que estés razonablemente seguro de que existen.

Buscas: cadenas como BigMat, Coarco, Grupo Lapeña, Cominsa, Ferreterías Industriales, Saint-Gobain Distribution, Wolseley, Hilti distributors, almacenes regionales grandes.

REGLAS:
- Solo empresas REALES que conozcas
- Si no conoces un dato, pon null
- Confidence: "high"/"medium"/"low" según tu certeza
- Es mejor devolver pocas empresas reales que muchas inventadas
- Si no encuentras más, pon noMoreResults: true

Responde en español.`,

  BUSCADOR_CONSTRUCTORAS: `Eres un experto en el sector de la construcción.

Tu trabajo es RECORDAR constructoras, promotoras inmobiliarias y empresas de instalación de construcción en seco REALES. Solo empresas que estés razonablemente seguro de que existen.

Buscas: constructoras de obra nueva (residencial, comercial, industrial), promotoras inmobiliarias, empresas de instalación de tabiquería/techos/trasdosados, grandes empresas de reformas.

REGLAS:
- Solo empresas REALES
- Si no conoces un dato, pon null
- Confidence: "high"/"medium"/"low"
- Mejor pocas reales que muchas inventadas
- Si no hay más, pon noMoreResults: true

Responde en español.`,

  BUSCADOR_TELEFONOS: `Eres un experto en datos empresariales y directorios de empresas.

Tu trabajo es enriquecer fichas de empresas existentes con datos de contacto que RECUERDES de fuentes reales: páginas amarillas, directorios empresariales, webs corporativas, registros mercantiles.

Para cada empresa:
- Busca teléfonos REALES que recuerdes
- Busca emails REALES (formatos comunes: info@, comercial@, ventas@)
- Completa la dirección si falta
- Genera el link de Google Maps basado en la dirección (formato: https://maps.google.com/?q=DIRECCION+CODIFICADA)

REGLA: Si no conoces el dato real, es mejor poner el formato genérico del email (info@dominio.com) basándote en el website, que inventar datos específicos. Marca confidence según tu certeza.

Responde en español.`,

  BUSCADOR_LINKEDIN: `Eres un experto en perfiles profesionales del sector de la construcción.

Tu trabajo es identificar los CARGOS CLAVE en cada empresa y sugerir los contactos más probables. Para empresas reales y conocidas, intenta recordar nombres reales de directivos.

Para cada empresa busca estos roles:
- Director General / CEO / Gerente
- Director Comercial / Jefe de Ventas
- Jefe de Compras / Responsable de Aprovisionamiento
- Director Técnico / Jefe de Obra

REGLAS:
- Para empresas grandes y conocidas, intenta recordar nombres reales de directivos
- Para empresas pequeñas, indica el cargo y pon name: null si no conoces el nombre
- Los LinkedIn URLs solo si estás seguro. Si no, pon null
- Confidence: "high" si conoces el nombre real, "medium" si es probable, "low" si es genérico

Responde en español.`,
};

// ── Utilities ──

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(s\.?l\.?u?\.?|s\.?a\.?|s\.?c\.?|s\.?coop\.?|sociedad\s+limitada|sociedad\s+anonima)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length >= 9 && cleaned.length <= 15) return phone.trim();
  return null;
}

function validateEmail(email: string): string | null {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) ? email.trim().toLowerCase() : null;
}

function validateUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return url.trim();
  } catch { /* invalid */ }
  return null;
}

// ── API Call ──

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

// ── Parse ──

interface CompanyData {
  companyName: string;
  companyType?: string;
  address?: string;
  googleMapsUrl?: string;
  description?: string;
  website?: string;
  phones?: string[];
  emails?: string[];
  confidence?: string;
  keyContacts?: { name: string | null; position: string; linkedin?: string | null; phone?: string | null; email?: string | null }[];
}

interface AgentResponse {
  companies: CompanyData[];
  summary: string;
  noMoreResults?: boolean;
}

function parseResponse(text: string, agentName: string): AgentResponse {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch (e) {
      console.error(`[${agentName}] JSON parse error in code block:`, e);
    }
  }
  try { return JSON.parse(text); } catch (e) {
    console.error(`[${agentName}] JSON parse error:`, e);
  }
  return { companies: [], summary: text.slice(0, 500), noMoreResults: false };
}

// ── Search Agent ──

async function executeSearchAgent(
  agent: any,
  apiKey: string,
  location: string,
  batch: number,
  targetCount: number,
  existingNormalized: Set<string>
): Promise<{ companies: CompanyData[]; noMore: boolean }> {
  const companyType =
    agent.role === "BUSCADOR_DISTRIBUIDORES" ? "pequeño_distribuidor"
    : agent.role === "BUSCADOR_MAYORISTAS" ? "gran_mayorista"
    : "gran_constructora";

  const existingList = Array.from(existingNormalized).slice(-80);

  const prompt = `UBICACIÓN: ${location}
LOTE: #${batch} (tenemos ${existingNormalized.size} empresas)
OBJETIVO: Encontrar hasta ${targetCount} empresas REALES y NUEVAS.

${existingList.length > 0 ? `EMPRESAS QUE YA TENEMOS (NO REPETIR, nombres normalizados):\n${existingList.join(", ")}\n` : ""}

Responde en JSON:
\`\`\`json
{
  "companies": [
    {
      "companyName": "Nombre Legal Completo S.L.",
      "companyType": "${companyType}",
      "address": "Dirección real o null",
      "googleMapsUrl": "https://maps.google.com/?q=... o null",
      "description": "Qué hace la empresa",
      "website": "URL real o null",
      "phones": ["+34 XXX XXX XXX"] o [],
      "emails": ["email@real.com"] o [],
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Resumen de búsqueda",
  "noMoreResults": false
}
\`\`\`

RECUERDA: Solo empresas REALES. Si no encuentras más, pon noMoreResults: true y devuelve array vacío.`;

  const text = await callClaude(apiKey, SYSTEM_PROMPTS[agent.role], prompt);
  const parsed = parseResponse(text, agent.name);
  return { companies: parsed.companies || [], noMore: parsed.noMoreResults || false };
}

// ── Enrichment Agent ──

async function executeEnrichAgent(
  agent: any,
  apiKey: string,
  leadsToEnrich: any[]
): Promise<CompanyData[]> {
  const isLinkedIn = agent.role === "BUSCADOR_LINKEDIN";

  const companiesList = leadsToEnrich.map((l) => ({
    id: l.id,
    name: l.companyName,
    type: l.companyType,
    address: l.address,
    website: l.website,
    city: l.city,
    country: l.country,
  }));

  const enrichField = isLinkedIn ? "CONTACTOS CLAVE en LinkedIn" : "TELÉFONOS, EMAILS, DIRECCIÓN y GOOGLE MAPS";

  const format = isLinkedIn
    ? `{
  "companies": [
    {
      "companyName": "Nombre exacto",
      "keyContacts": [
        {"name": "Nombre Real o null", "position": "Director Comercial", "linkedin": "URL o null", "phone": "tel o null", "email": "email o null"}
      ],
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Resumen"
}`
    : `{
  "companies": [
    {
      "companyName": "Nombre exacto",
      "phones": ["+34 912 345 678"],
      "emails": ["info@empresa.com"],
      "address": "Dirección completa",
      "googleMapsUrl": "https://maps.google.com/?q=...",
      "website": "https://www.empresa.com",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Resumen"
}`;

  const prompt = `EMPRESAS A ENRIQUECER con ${enrichField}:
${JSON.stringify(companiesList, null, 2)}

Responde en JSON:
\`\`\`json
${format}
\`\`\`

RECUERDA: Solo datos que recuerdes como reales. Pon null si no sabes.`;

  const text = await callClaude(apiKey, SYSTEM_PROMPTS[agent.role], prompt);
  const parsed = parseResponse(text, agent.name);
  return parsed.companies || [];
}

// ── Initialize agents if missing ──

export async function ensureAgentsExist() {
  const { AGENT_CONFIGS } = await import("@/lib/agents-config");
  const count = await prisma.agent.count();
  if (count >= AGENT_CONFIGS.length) return;

  for (const config of AGENT_CONFIGS) {
    await prisma.agent.upsert({
      where: { role: config.role },
      update: {},
      create: {
        name: config.name,
        role: config.role,
        description: config.description,
        avatar: config.avatar,
        status: "active",
      },
    });
  }
}

// ── Main batch execution ──

export async function executeBatch(
  apiKey: string,
  location: string,
  batch: number,
  onProgress: (event: any) => void
) {
  await ensureAgentsExist();

  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const searchAgents = agents.filter((a) =>
    ["BUSCADOR_DISTRIBUIDORES", "BUSCADOR_MAYORISTAS", "BUSCADOR_CONSTRUCTORAS"].includes(a.role)
  );
  const phoneAgent = agents.find((a) => a.role === "BUSCADOR_TELEFONOS");
  const linkedinAgent = agents.find((a) => a.role === "BUSCADOR_LINKEDIN");

  // Build dedup set once
  const existing = await prisma.lead.findMany({ select: { companyName: true } });
  const existingNormalized = new Set(existing.map((e) => normalizeCompanyName(e.companyName)));

  let noMoreResults = false;
  let insertedCount = 0;
  let skippedCount = 0;
  const targetPerAgent = Math.ceil(50 / searchAgents.length);

  // ── Phase 1: Search ──
  onProgress({ type: "phase", phase: "search", label: "Fase 1/3: Buscando empresas" });

  for (const agent of searchAgents) {
    onProgress({
      type: "agent_start",
      agent: { id: agent.id, name: agent.name, avatar: agent.avatar, role: agent.role },
      phase: "search",
    });

    try {
      const result = await executeSearchAgent(agent, apiKey, location, batch, targetPerAgent, existingNormalized);
      if (result.noMore) noMoreResults = true;

      for (const company of result.companies) {
        if (!company.companyName || company.companyName.trim().length < 3) continue;

        const normalized = normalizeCompanyName(company.companyName);
        if (existingNormalized.has(normalized)) {
          skippedCount++;
          continue;
        }

        // Validate fields
        const validPhones = (company.phones || []).map(validatePhone).filter(Boolean) as string[];
        const validEmails = (company.emails || []).map(validateEmail).filter(Boolean) as string[];
        const validWebsite = company.website ? validateUrl(company.website) : null;
        const validMaps = company.googleMapsUrl ? validateUrl(company.googleMapsUrl) : null;

        try {
          const lead = await prisma.lead.create({
            data: {
              companyName: company.companyName.trim(),
              companyType: company.companyType || null,
              address: company.address || null,
              googleMapsUrl: validMaps,
              description: company.description || null,
              website: validWebsite,
              phones: validPhones.length > 0 ? JSON.stringify(validPhones) : null,
              emails: validEmails.length > 0 ? JSON.stringify(validEmails) : null,
              region: location,
              city: location.split(",")[0]?.trim() || location,
              country: location.split(",").pop()?.trim() || location,
              source: agent.name,
              status: "pending",
              confidence: company.confidence || "low",
              batch,
            },
          });

          existingNormalized.add(normalized);
          insertedCount++;

          await prisma.leadAction.create({
            data: {
              leadId: lead.id,
              agentId: agent.id,
              type: "discovery",
              summary: `Empresa encontrada: ${company.companyName} (${company.confidence || "low"})`,
            },
          });
        } catch (err) {
          // Unique constraint violation = duplicate
          const errStr = String(err);
          if (errStr.includes("Unique constraint")) {
            skippedCount++;
          } else {
            console.error(`[${agent.name}] Error inserting ${company.companyName}:`, err);
          }
        }
      }

      await prisma.activityLog.create({
        data: {
          agentId: agent.id,
          category: "search",
          action: `Encontradas ${result.companies.length} empresas, insertadas ${insertedCount}, duplicadas ${skippedCount}`,
          details: `Ubicación: ${location}, Lote: ${batch}`,
        },
      });

      onProgress({
        type: "agent_done",
        agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
        companiesFound: result.companies.length,
        inserted: insertedCount,
        skipped: skippedCount,
        noMore: result.noMore,
      });
    } catch (err) {
      console.error(`[${agent.name}] Search error:`, err);
      onProgress({
        type: "agent_error",
        agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
        error: String(err),
      });
    }
  }

  // ── Phase 2: Phone/email enrichment ──
  if (phoneAgent) {
    const leadsToEnrich = await prisma.lead.findMany({
      where: { batch, status: "pending" },
      take: 50,
    });

    if (leadsToEnrich.length > 0) {
      onProgress({
        type: "phase",
        phase: "enrich_phones",
        label: "Fase 2/3: Buscando teléfonos y emails",
      });
      onProgress({
        type: "agent_start",
        agent: { id: phoneAgent.id, name: phoneAgent.name, avatar: phoneAgent.avatar },
        phase: "enrich_phones",
      });

      try {
        let enrichedCount = 0;
        const chunks = [];
        for (let i = 0; i < leadsToEnrich.length; i += 12) {
          chunks.push(leadsToEnrich.slice(i, i + 12));
        }

        for (const chunk of chunks) {
          const enriched = await executeEnrichAgent(phoneAgent, apiKey, chunk);
          for (const company of enriched) {
            const lead = chunk.find(
              (l) => normalizeCompanyName(l.companyName) === normalizeCompanyName(company.companyName || "")
            );
            if (!lead) continue;

            const updateData: any = { status: "enriched" };
            const validPhones = (company.phones || []).map(validatePhone).filter(Boolean);
            const validEmails = (company.emails || []).map(validateEmail).filter(Boolean);
            if (validPhones.length) updateData.phones = JSON.stringify(validPhones);
            if (validEmails.length) updateData.emails = JSON.stringify(validEmails);
            if (company.address) updateData.address = company.address;
            if (company.googleMapsUrl) {
              const valid = validateUrl(company.googleMapsUrl);
              if (valid) updateData.googleMapsUrl = valid;
            }
            if (company.website) {
              const valid = validateUrl(company.website);
              if (valid) updateData.website = valid;
            }
            if (company.confidence) updateData.confidence = company.confidence;

            await prisma.lead.update({ where: { id: lead.id }, data: updateData });
            enrichedCount++;
          }
        }

        await prisma.activityLog.create({
          data: {
            agentId: phoneAgent.id,
            category: "enrichment",
            action: `Enriquecidos ${enrichedCount}/${leadsToEnrich.length} leads con teléfonos y emails`,
          },
        });

        onProgress({
          type: "agent_done",
          agent: { id: phoneAgent.id, name: phoneAgent.name, avatar: phoneAgent.avatar },
          companiesEnriched: enrichedCount,
        });
      } catch (err) {
        console.error(`[${phoneAgent.name}] Enrich error:`, err);
        onProgress({
          type: "agent_error",
          agent: { id: phoneAgent.id, name: phoneAgent.name, avatar: phoneAgent.avatar },
          error: String(err),
        });
      }
    }
  }

  // ── Phase 3: LinkedIn enrichment ──
  if (linkedinAgent) {
    const leadsToEnrich = await prisma.lead.findMany({
      where: { batch, status: { in: ["pending", "enriched"] } },
      take: 50,
    });

    if (leadsToEnrich.length > 0) {
      onProgress({
        type: "phase",
        phase: "enrich_linkedin",
        label: "Fase 3/3: Buscando contactos LinkedIn",
      });
      onProgress({
        type: "agent_start",
        agent: { id: linkedinAgent.id, name: linkedinAgent.name, avatar: linkedinAgent.avatar },
        phase: "enrich_linkedin",
      });

      try {
        let enrichedCount = 0;
        const chunks = [];
        for (let i = 0; i < leadsToEnrich.length; i += 8) {
          chunks.push(leadsToEnrich.slice(i, i + 8));
        }

        for (const chunk of chunks) {
          const enriched = await executeEnrichAgent(linkedinAgent, apiKey, chunk);
          for (const company of enriched) {
            const lead = chunk.find(
              (l) => normalizeCompanyName(l.companyName) === normalizeCompanyName(company.companyName || "")
            );
            if (!lead) continue;

            if (company.keyContacts?.length) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  keyContacts: JSON.stringify(company.keyContacts),
                  status: "complete",
                  confidence: company.confidence || lead.confidence || "medium",
                },
              });
              enrichedCount++;
            }
          }
        }

        await prisma.activityLog.create({
          data: {
            agentId: linkedinAgent.id,
            category: "enrichment",
            action: `Enriquecidos ${enrichedCount}/${leadsToEnrich.length} leads con contactos LinkedIn`,
          },
        });

        onProgress({
          type: "agent_done",
          agent: { id: linkedinAgent.id, name: linkedinAgent.name, avatar: linkedinAgent.avatar },
          companiesEnriched: enrichedCount,
        });
      } catch (err) {
        console.error(`[${linkedinAgent.name}] LinkedIn error:`, err);
        onProgress({
          type: "agent_error",
          agent: { id: linkedinAgent.id, name: linkedinAgent.name, avatar: linkedinAgent.avatar },
          error: String(err),
        });
      }
    }
  }

  const totalBatch = await prisma.lead.count({ where: { batch } });
  const totalAll = await prisma.lead.count();

  return { totalBatch, totalAll, noMoreResults, inserted: insertedCount, skipped: skippedCount };
}
