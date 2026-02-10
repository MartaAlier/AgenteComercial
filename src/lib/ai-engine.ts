import prisma from "@/lib/prisma";

const SYSTEM_PROMPTS: Record<string, string> = {
  BUSCADOR_DISTRIBUIDORES: `Eres un agente especializado en encontrar PEQUEÑOS DISTRIBUIDORES de materiales de construcción en seco (placas de yeso, Pladur, Knauf, Placo/Saint-Gobain).

Buscas: tiendas de materiales, pequeños almacenes, distribuidores locales, puntos de venta especializados en construcción en seco, drywall, placas de yeso laminado.

Para cada empresa que encuentres, proporciona:
- Nombre completo de la empresa
- Dirección completa
- Link de Google Maps (formato: https://maps.google.com/?q=DIRECCION+CODIFICADA)
- Descripción breve de qué hace la empresa
- Website si lo conoces
- Teléfonos si los conoces
- Emails si los conoces

IMPORTANTE: Genera empresas REALES y VERIFICABLES de la zona indicada. Sé específico con nombres y direcciones reales. Si no conoces empresas reales de esa zona, genera empresas con nombres y direcciones plausibles y realistas para esa ubicación.

Responde siempre en español.`,

  BUSCADOR_MAYORISTAS: `Eres un agente especializado en encontrar GRANDES MAYORISTAS y cadenas de distribución de materiales de construcción.

Buscas: grandes almacenes de distribución, cadenas como BigMat, Coarco, Grupo Lapeña, Grupo Comafe, almacenes regionales grandes, distribuidores con múltiples puntos de venta, empresas con facturación significativa en el sector.

Para cada empresa, proporciona:
- Nombre completo de la empresa
- Dirección de sede principal
- Link de Google Maps
- Descripción de la empresa (tamaño, cobertura, especialidad)
- Website
- Teléfonos y emails corporativos

IMPORTANTE: Genera empresas REALES y VERIFICABLES. Prioriza empresas grandes con capacidad de compra significativa.

Responde siempre en español.`,

  BUSCADOR_CONSTRUCTORAS: `Eres un agente especializado en encontrar GRANDES CONSTRUCTORAS y promotoras inmobiliarias que usen placas de yeso en sus proyectos.

Buscas: constructoras de obra nueva, promotoras inmobiliarias, empresas de reformas a gran escala, empresas de instalación de sistemas de construcción en seco (tabiques, falsos techos, trasdosados).

Para cada empresa, proporciona:
- Nombre completo
- Dirección sede
- Link de Google Maps
- Descripción (tipo de obras, tamaño, especialidad)
- Website
- Teléfonos y emails

IMPORTANTE: Genera empresas REALES y VERIFICABLES de la zona indicada. Incluye constructoras que realicen obra nueva residencial, comercial e industrial.

Responde siempre en español.`,

  BUSCADOR_TELEFONOS: `Eres un agente especializado en encontrar DATOS DE CONTACTO de empresas del sector de la construcción.

Tu trabajo es enriquecer fichas de empresas existentes con:
- Teléfonos de contacto (fijo y móvil)
- Emails corporativos (general, comercial, compras)
- Dirección completa si falta
- Link de Google Maps si falta
- Website si falta

Busca estos datos en directorios empresariales, páginas amarillas, registros mercantiles, webs corporativas.

IMPORTANTE: Proporciona datos lo más reales y verificables posible para las empresas indicadas.

Responde siempre en español.`,

  BUSCADOR_LINKEDIN: `Eres un agente especializado en encontrar CONTACTOS CLAVE en LinkedIn de empresas del sector construcción.

Para cada empresa, busca:
- Director General / CEO / Gerente
- Director Comercial / Jefe de Ventas
- Jefe de Compras / Responsable de Aprovisionamiento
- Director de Obra / Jefe de Proyectos
- Cualquier cargo relevante para la venta de materiales

Para cada contacto proporciona:
- Nombre completo
- Cargo en la empresa
- URL de perfil LinkedIn (formato: https://linkedin.com/in/nombre-apellido)
- Teléfono directo si lo encuentras
- Email directo si lo encuentras

IMPORTANTE: Genera nombres plausibles para los cargos indicados. Los perfiles de LinkedIn deben tener formato correcto.

Responde siempre en español.`,
};

interface CompanyData {
  companyName: string;
  companyType?: string;
  address?: string;
  googleMapsUrl?: string;
  description?: string;
  website?: string;
  phones?: string[];
  emails?: string[];
  keyContacts?: { name: string; position: string; linkedin?: string; phone?: string; email?: string }[];
}

interface AgentResponse {
  companies: CompanyData[];
  summary: string;
  noMoreResults?: boolean;
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

function parseResponse(text: string): AgentResponse {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch { /* fall through */ }
  }
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }
  return { companies: [], summary: text.slice(0, 500), noMoreResults: false };
}

async function executeSearchAgent(
  agent: any,
  apiKey: string,
  location: string,
  batch: number,
  targetCount: number
): Promise<{ companies: CompanyData[]; noMore: boolean }> {
  const existing = await prisma.lead.findMany({ select: { companyName: true } });
  const existingNames = existing.map((e) => e.companyName.toLowerCase());

  const companyType =
    agent.role === "BUSCADOR_DISTRIBUIDORES" ? "pequeño_distribuidor"
    : agent.role === "BUSCADOR_MAYORISTAS" ? "gran_mayorista"
    : "gran_constructora";

  const prompt = `UBICACIÓN: ${location}
LOTE: #${batch} (ya tenemos ${existingNames.length} empresas en total)
OBJETIVO: Encontrar ${targetCount} empresas NUEVAS que NO estén en nuestra base de datos.

${existingNames.length > 0 ? `EMPRESAS QUE YA TENEMOS (NO REPETIR):\n${existingNames.slice(-100).join(", ")}\n` : ""}

Responde en JSON con este formato exacto:
\`\`\`json
{
  "companies": [
    {
      "companyName": "Nombre Completo SA",
      "companyType": "${companyType}",
      "address": "Calle Ejemplo 123, 28001 Madrid",
      "googleMapsUrl": "https://maps.google.com/?q=Calle+Ejemplo+123+28001+Madrid",
      "description": "Descripción breve de la empresa",
      "website": "https://www.ejemplo.com",
      "phones": ["+34 912 345 678", "+34 612 345 678"],
      "emails": ["info@ejemplo.com", "comercial@ejemplo.com"]
    }
  ],
  "summary": "Resumen de lo encontrado",
  "noMoreResults": false
}
\`\`\`

Si ya no puedes encontrar más empresas nuevas en la zona, pon "noMoreResults": true.
Genera entre 10 y ${targetCount} empresas. Sé específico y realista.`;

  const text = await callClaude(apiKey, SYSTEM_PROMPTS[agent.role], prompt);
  const parsed = parseResponse(text);
  return { companies: parsed.companies || [], noMore: parsed.noMoreResults || false };
}

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
    city: l.city,
    country: l.country,
  }));

  const prompt = `EMPRESAS A ENRIQUECER:
${JSON.stringify(companiesList, null, 2)}

${isLinkedIn
    ? `Para cada empresa, busca los CONTACTOS CLAVE en LinkedIn.
Responde en JSON:
\`\`\`json
{
  "companies": [
    {
      "companyName": "Nombre exacto de la empresa",
      "keyContacts": [
        {"name": "Juan García López", "position": "Director Comercial", "linkedin": "https://linkedin.com/in/juan-garcia-lopez", "phone": "+34 612 345 678", "email": "jgarcia@empresa.com"}
      ]
    }
  ],
  "summary": "Resumen"
}
\`\`\``
    : `Para cada empresa, busca TELÉFONOS, EMAILS, DIRECCIÓN completa y GOOGLE MAPS.
Responde en JSON:
\`\`\`json
{
  "companies": [
    {
      "companyName": "Nombre exacto de la empresa",
      "phones": ["+34 912 345 678"],
      "emails": ["info@empresa.com"],
      "address": "Dirección completa",
      "googleMapsUrl": "https://maps.google.com/?q=Direccion+Completa",
      "website": "https://www.empresa.com"
    }
  ],
  "summary": "Resumen"
}
\`\`\``}

Enriquece TODAS las empresas de la lista. Sé lo más preciso posible.`;

  const text = await callClaude(apiKey, SYSTEM_PROMPTS[agent.role], prompt);
  const parsed = parseResponse(text);
  return parsed.companies || [];
}

export async function executeBatch(
  apiKey: string,
  location: string,
  batch: number,
  onProgress: (event: any) => void
) {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const searchAgents = agents.filter((a) =>
    ["BUSCADOR_DISTRIBUIDORES", "BUSCADOR_MAYORISTAS", "BUSCADOR_CONSTRUCTORAS"].includes(a.role)
  );
  const phoneAgent = agents.find((a) => a.role === "BUSCADOR_TELEFONOS");
  const linkedinAgent = agents.find((a) => a.role === "BUSCADOR_LINKEDIN");

  let noMoreResults = false;
  const targetPerAgent = Math.ceil(50 / searchAgents.length);

  // Phase 1: Search
  for (const agent of searchAgents) {
    onProgress({
      type: "agent_start",
      agent: { id: agent.id, name: agent.name, avatar: agent.avatar, role: agent.role },
      phase: "search",
    });

    try {
      const result = await executeSearchAgent(agent, apiKey, location, batch, targetPerAgent);
      if (result.noMore) noMoreResults = true;

      for (const company of result.companies) {
        try {
          const lead = await prisma.lead.create({
            data: {
              companyName: company.companyName,
              companyType: company.companyType || null,
              address: company.address || null,
              googleMapsUrl: company.googleMapsUrl || null,
              description: company.description || null,
              website: company.website || null,
              phones: company.phones ? JSON.stringify(company.phones) : null,
              emails: company.emails ? JSON.stringify(company.emails) : null,
              region: location,
              city: location.split(",")[0]?.trim() || location,
              country: location.split(",").pop()?.trim() || location,
              source: agent.name,
              status: "pending",
              batch,
            },
          });
          await prisma.leadAction.create({
            data: {
              leadId: lead.id,
              agentId: agent.id,
              type: "discovery",
              summary: `Empresa encontrada: ${company.companyName}`,
            },
          });
        } catch { /* skip */ }
      }

      await prisma.activityLog.create({
        data: {
          agentId: agent.id,
          category: "search",
          action: `Encontradas ${result.companies.length} empresas en ${location}`,
        },
      });

      onProgress({
        type: "agent_done",
        agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
        companiesFound: result.companies.length,
        noMore: result.noMore,
      });
    } catch (err) {
      onProgress({
        type: "agent_error",
        agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
        error: String(err),
      });
    }
  }

  // Phase 2: Phone/email enrichment
  if (phoneAgent) {
    const leadsToEnrich = await prisma.lead.findMany({
      where: { batch, status: "pending" },
      take: 50,
    });

    if (leadsToEnrich.length > 0) {
      onProgress({
        type: "agent_start",
        agent: { id: phoneAgent.id, name: phoneAgent.name, avatar: phoneAgent.avatar },
        phase: "enrich_phones",
      });

      try {
        const chunks = [];
        for (let i = 0; i < leadsToEnrich.length; i += 15) {
          chunks.push(leadsToEnrich.slice(i, i + 15));
        }

        for (const chunk of chunks) {
          const enriched = await executeEnrichAgent(phoneAgent, apiKey, chunk);
          for (const company of enriched) {
            const lead = chunk.find(
              (l) => l.companyName.toLowerCase() === company.companyName?.toLowerCase()
            );
            if (!lead) continue;

            const updateData: any = {};
            if (company.phones?.length) updateData.phones = JSON.stringify(company.phones);
            if (company.emails?.length) updateData.emails = JSON.stringify(company.emails);
            if (company.address) updateData.address = company.address;
            if (company.googleMapsUrl) updateData.googleMapsUrl = company.googleMapsUrl;
            if (company.website) updateData.website = company.website;
            updateData.status = "enriched";

            await prisma.lead.update({ where: { id: lead.id }, data: updateData });
          }
        }

        await prisma.activityLog.create({
          data: {
            agentId: phoneAgent.id,
            category: "enrichment",
            action: `Enriquecidos ${leadsToEnrich.length} leads con teléfonos y emails`,
          },
        });

        onProgress({
          type: "agent_done",
          agent: { id: phoneAgent.id, name: phoneAgent.name, avatar: phoneAgent.avatar },
          companiesEnriched: leadsToEnrich.length,
        });
      } catch (err) {
        onProgress({
          type: "agent_error",
          agent: { id: phoneAgent.id, name: phoneAgent.name, avatar: phoneAgent.avatar },
          error: String(err),
        });
      }
    }
  }

  // Phase 3: LinkedIn enrichment
  if (linkedinAgent) {
    const leadsToEnrich = await prisma.lead.findMany({
      where: { batch, status: { in: ["pending", "enriched"] } },
      take: 50,
    });

    if (leadsToEnrich.length > 0) {
      onProgress({
        type: "agent_start",
        agent: { id: linkedinAgent.id, name: linkedinAgent.name, avatar: linkedinAgent.avatar },
        phase: "enrich_linkedin",
      });

      try {
        const chunks = [];
        for (let i = 0; i < leadsToEnrich.length; i += 10) {
          chunks.push(leadsToEnrich.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const enriched = await executeEnrichAgent(linkedinAgent, apiKey, chunk);
          for (const company of enriched) {
            const lead = chunk.find(
              (l) => l.companyName.toLowerCase() === company.companyName?.toLowerCase()
            );
            if (!lead) continue;

            if (company.keyContacts?.length) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  keyContacts: JSON.stringify(company.keyContacts),
                  status: "complete",
                },
              });
            }
          }
        }

        await prisma.activityLog.create({
          data: {
            agentId: linkedinAgent.id,
            category: "enrichment",
            action: `Enriquecidos ${leadsToEnrich.length} leads con contactos LinkedIn`,
          },
        });

        onProgress({
          type: "agent_done",
          agent: { id: linkedinAgent.id, name: linkedinAgent.name, avatar: linkedinAgent.avatar },
          companiesEnriched: leadsToEnrich.length,
        });
      } catch (err) {
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

  return { totalBatch, totalAll, noMoreResults };
}
