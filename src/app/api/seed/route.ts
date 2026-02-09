export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AGENT_CONFIGS } from "@/lib/agents-config";

const SAMPLE_LEADS = [
  { companyName: "Construcciones Martínez S.L.", contactName: "Juan Martínez", contactEmail: "juan@cmartinez.es", contactPhone: "+34 612 345 678", position: "Director de Compras", industry: "Construcción residencial", segment: "Constructor", region: "Madrid", source: "Investigación de mercado", status: "new", priority: "high", score: 75, estimatedValue: 45000 },
  { companyName: "Distribuciones Ibéricas", contactName: "Elena García", contactEmail: "egarcia@distibericas.com", contactPhone: "+34 623 456 789", position: "Gerente Comercial", industry: "Distribución de materiales", segment: "Distribuidor", region: "Barcelona", source: "Referencia", status: "contacted", priority: "high", score: 82, estimatedValue: 120000 },
  { companyName: "InstalPladur Pro", contactName: "Roberto Sánchez", contactEmail: "roberto@instalpladur.es", contactPhone: "+34 634 567 890", position: "Propietario", industry: "Instalación de sistemas", segment: "Instalador", region: "Valencia", source: "Feria Construmat", status: "interested", priority: "medium", score: 68, estimatedValue: 28000 },
  { companyName: "Grupo Reforma Total", contactName: "Ana López", contactEmail: "alopez@reformatotal.es", contactPhone: "+34 645 678 901", position: "Directora General", industry: "Rehabilitación y reformas", segment: "Reformista", region: "Sevilla", source: "LinkedIn", status: "negotiating", priority: "urgent", score: 91, estimatedValue: 75000 },
  { companyName: "Arquitectura Vanguardia", contactName: "David Torres", contactEmail: "dtorres@arqvanguardia.com", contactPhone: "+34 656 789 012", position: "Socio Director", industry: "Arquitectura y diseño", segment: "Arquitecto", region: "Bilbao", source: "Web corporativa", status: "new", priority: "medium", score: 55, estimatedValue: 35000 },
  { companyName: "Promotora Horizonte", contactName: "Carmen Ruiz", contactEmail: "cruiz@phorizonte.es", contactPhone: "+34 667 890 123", position: "Directora de Proyectos", industry: "Promoción inmobiliaria", segment: "Promotor inmobiliario", region: "Málaga", source: "Evento sectorial", status: "contacted", priority: "high", score: 78, estimatedValue: 200000 },
  { companyName: "BuildTech Solutions", contactName: "Miguel Fernández", contactEmail: "mfernandez@buildtech.es", contactPhone: "+34 678 901 234", position: "CTO", industry: "Construcción comercial", segment: "Constructor", region: "Madrid", source: "Investigación de mercado", status: "new", priority: "medium", score: 60, estimatedValue: 90000 },
  { companyName: "MatConstru Distribución", contactName: "Laura Gómez", contactEmail: "lgomez@matconstru.com", contactPhone: "+34 689 012 345", position: "Jefa de Compras", industry: "Distribución de materiales", segment: "Distribuidor", region: "Zaragoza", source: "Puerta fría", status: "new", priority: "low", score: 42, estimatedValue: 55000 },
  { companyName: "Reformas Excelencia", contactName: "Pablo Navarro", contactEmail: "pnavarro@rexcelencia.es", contactPhone: "+34 690 123 456", position: "Director Comercial", industry: "Rehabilitación y reformas", segment: "Reformista", region: "Alicante", source: "Google Ads", status: "interested", priority: "medium", score: 71, estimatedValue: 32000 },
  { companyName: "Facilities Pro España", contactName: "Isabel Moreno", contactEmail: "imoreno@facilitiespro.es", contactPhone: "+34 601 234 567", position: "Gerente de Operaciones", industry: "Construcción comercial", segment: "Empresa de facilities", region: "Barcelona", source: "Networking", status: "new", priority: "medium", score: 50, estimatedValue: 65000 },
  { companyName: "Tabiquería Express", contactName: "Andrés Jiménez", contactEmail: "ajimenez@tabexpress.es", contactPhone: "+34 612 999 888", position: "Fundador", industry: "Instalación de sistemas", segment: "Instalador", region: "Madrid", source: "Instagram", status: "contacted", priority: "medium", score: 63, estimatedValue: 18000 },
  { companyName: "Constructora del Levante", contactName: "Sofía Hernández", contactEmail: "shernandez@constlevante.com", contactPhone: "+34 623 888 777", position: "Directora de Obra", industry: "Construcción residencial", segment: "Constructor", region: "Murcia", source: "Referencia", status: "new", priority: "high", score: 80, estimatedValue: 110000 },
];

export async function POST() {
  try {
    // Clear existing data
    await prisma.leadAction.deleteMany();
    await prisma.scheduledCall.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.keyResult.deleteMany();
    await prisma.objective.deleteMany();
    await prisma.kPI.deleteMany();
    await prisma.agentTask.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.agent.deleteMany();

    // Create agents
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

    // Create leads
    const leads = [];
    for (const leadData of SAMPLE_LEADS) {
      const lead = await prisma.lead.create({ data: leadData });
      leads.push(lead);
    }

    // Create OKRs for each agent
    for (let i = 0; i < agents.length; i++) {
      const config = AGENT_CONFIGS[i];
      for (const objTitle of config.objectives) {
        await prisma.objective.create({
          data: {
            agentId: agents[i].id,
            title: objTitle,
            quarter: "Q1-2026",
            progress: Math.floor(Math.random() * 60) + 10,
            status: ["on_track", "on_track", "at_risk", "on_track"][Math.floor(Math.random() * 4)],
            keyResults: {
              create: [
                {
                  title: `KR1: ${objTitle} - Fase inicial`,
                  targetValue: 100,
                  currentValue: Math.floor(Math.random() * 80) + 10,
                  unit: "%",
                  progress: Math.floor(Math.random() * 70) + 15,
                },
                {
                  title: `KR2: ${objTitle} - Entregables`,
                  targetValue: 10,
                  currentValue: Math.floor(Math.random() * 8) + 1,
                  unit: "entregables",
                  progress: Math.floor(Math.random() * 60) + 20,
                },
              ],
            },
          },
        });
      }
    }

    // Create team objective
    await prisma.objective.create({
      data: {
        agentId: null,
        title: "Generar 50 leads cualificados para placas de yeso en Q1",
        quarter: "Q1-2026",
        progress: 35,
        status: "on_track",
        keyResults: {
          create: [
            { title: "50 leads identificados y cualificados", targetValue: 50, currentValue: 12, unit: "leads", progress: 24 },
            { title: "15 reuniones con director comercial agendadas", targetValue: 15, currentValue: 4, unit: "reuniones", progress: 27 },
            { title: "5 propuestas comerciales enviadas", targetValue: 5, currentValue: 1, unit: "propuestas", progress: 20 },
          ],
        },
      },
    });

    // Create KPIs
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    for (let i = 0; i < agents.length; i++) {
      const config = AGENT_CONFIGS[i];
      for (const kpi of config.kpiTemplates) {
        await prisma.kPI.create({
          data: {
            agentId: agents[i].id,
            name: kpi.name,
            category: kpi.category,
            targetValue: kpi.target,
            currentValue: Math.floor(Math.random() * kpi.target * 0.8),
            unit: kpi.unit,
            period: "monthly",
            periodStart: monthStart,
            periodEnd: monthEnd,
          },
        });
      }
    }

    // Create activity logs
    const logTemplates = [
      { agentIdx: 0, category: "research", action: "Análisis de mercado de placas de yeso en zona centro", details: "Identificados 15 distribuidores activos en Madrid y alrededores. Cuota de mercado estimada de Pladur: 45%, Knauf: 30%, Placo: 20%, otros: 5%." },
      { agentIdx: 0, category: "research", action: "Estudio de precios de la competencia Q1 2026", details: "Precios medios de placa estándar 13mm: 4.50-6.20€/m². Placa hidrófuga: 6.80-8.50€/m². Tendencia alcista del 3% respecto a Q4 2025." },
      { agentIdx: 1, category: "analysis", action: "Ficha técnica comparativa: Placa estándar vs hidrófuga", details: "Documento completo con especificaciones de Pladur, Knauf y Placo. Incluye resistencia, peso, aplicaciones y precios de referencia." },
      { agentIdx: 1, category: "analysis", action: "Argumentario de venta para segmento instaladores", details: "Preparado argumentario con ventajas competitivas, márgenes de referencia y casos de éxito. Listo para uso del equipo comercial." },
      { agentIdx: 2, category: "planning", action: "Plan de penetración en mercado de Valencia", details: "Identificados 8 distribuidores potenciales y 12 instaladores profesionales. Estrategia de 3 fases: presentación, demo, acuerdo comercial." },
      { agentIdx: 2, category: "outreach", action: "Contacto inicial con Distribuciones Ibéricas", details: "Primer contacto con Elena García. Interesada en ampliar catálogo de placas. Solicita reunión con muestras y condiciones comerciales." },
      { agentIdx: 3, category: "outreach", action: "Llamada de cualificación a Grupo Reforma Total", details: "Conversación de 25 minutos con Ana López. Empresa con 50 empleados, volumen mensual de 2000m² de placa. Muy interesada en proveedor alternativo." },
      { agentIdx: 3, category: "outreach", action: "Email de seguimiento a InstalPladur Pro", details: "Enviado catálogo técnico y lista de precios. Roberto Sánchez confirmó recepción y revisará la próxima semana." },
      { agentIdx: 3, category: "outreach", action: "Propuesta comercial a Promotora Horizonte", details: "Propuesta para suministro de 15.000m² de placa para proyecto residencial. Valor estimado: 200.000€. Pendiente de aprobación." },
      { agentIdx: 4, category: "reporting", action: "Informe semanal al Director Comercial", details: "Resumen: 12 leads en pipeline, 4 en fase de negociación, 2 propuestas enviadas. Valor total del pipeline: 873.000€. Proyección de cierre Q1: 295.000€." },
      { agentIdx: 4, category: "planning", action: "Reasignación de prioridades del equipo", details: "Prioridad alta para leads de distribuidores (mayor volumen). Pedro enfocado en Grupo Reforma Total y Promotora Horizonte. María trabajando canal Valencia." },
      { agentIdx: 0, category: "research", action: "Tendencias en construcción en seco 2026", details: "Crecimiento esperado del 7% en construcción en seco. Auge de reformas energéticas impulsa demanda de placas con aislamiento incorporado." },
      { agentIdx: 3, category: "outreach", action: "Llamada a Constructora del Levante", details: "Primer contacto con Sofía Hernández. 3 proyectos activos que requieren placa. Volumen estimado: 5000m²/mes. Solicita visita comercial." },
      { agentIdx: 2, category: "planning", action: "Estrategia de alianza con instaladores certificados", details: "Propuesta de programa de fidelización para instaladores: descuentos por volumen, formación técnica gratuita, certificación oficial." },
    ];

    for (const log of logTemplates) {
      await prisma.activityLog.create({
        data: {
          agentId: agents[log.agentIdx].id,
          category: log.category,
          action: log.action,
          details: log.details,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create lead actions
    const actionTemplates = [
      { leadIdx: 1, agentIdx: 2, type: "contact_attempt", summary: "Primer contacto telefónico con Distribuciones Ibéricas", result: "positive" },
      { leadIdx: 1, agentIdx: 3, type: "email_sent", summary: "Enviado catálogo y condiciones comerciales", result: "positive" },
      { leadIdx: 2, agentIdx: 3, type: "contact_attempt", summary: "Llamada de cualificación", result: "positive" },
      { leadIdx: 2, agentIdx: 1, type: "note", summary: "Preparada ficha técnica personalizada para InstalPladur", result: "neutral" },
      { leadIdx: 3, agentIdx: 3, type: "call_made", summary: "Reunión telefónica de 25 minutos - muy interesados", result: "positive" },
      { leadIdx: 3, agentIdx: 3, type: "qualification", summary: "Lead cualificado: alto volumen, necesidad clara, presupuesto aprobado", result: "positive" },
      { leadIdx: 5, agentIdx: 3, type: "meeting", summary: "Presentación de productos en oficinas de Promotora Horizonte", result: "positive" },
      { leadIdx: 5, agentIdx: 3, type: "email_sent", summary: "Propuesta comercial formal enviada - 15.000m² placa", result: "positive" },
      { leadIdx: 11, agentIdx: 0, type: "research", summary: "Investigación sobre Constructora del Levante: 3 proyectos activos", result: "positive" },
    ];

    for (const action of actionTemplates) {
      await prisma.leadAction.create({
        data: {
          leadId: leads[action.leadIdx].id,
          agentId: agents[action.agentIdx].id,
          type: action.type,
          summary: action.summary,
          result: action.result,
          createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create scheduled calls
    await prisma.scheduledCall.create({
      data: {
        leadId: leads[3].id,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        duration: 45,
        purpose: "Negociación de condiciones comerciales con Grupo Reforma Total",
        status: "scheduled",
        requestedBy: agents[3].id,
      },
    });
    await prisma.scheduledCall.create({
      data: {
        leadId: leads[5].id,
        scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        duration: 60,
        purpose: "Presentación de propuesta a Promotora Horizonte - proyecto residencial 15.000m²",
        status: "scheduled",
        requestedBy: agents[4].id,
      },
    });
    await prisma.scheduledCall.create({
      data: {
        leadId: leads[11].id,
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 30,
        purpose: "Primera reunión con Constructora del Levante - explorar necesidades",
        status: "scheduled",
        requestedBy: agents[3].id,
      },
    });

    // Create some agent tasks
    const taskTemplates = [
      { agentIdx: 0, title: "Completar mapa de distribuidores zona norte", status: "in_progress", priority: "high" },
      { agentIdx: 0, title: "Informe de precios competencia febrero 2026", status: "pending", priority: "medium" },
      { agentIdx: 1, title: "Actualizar fichas técnicas con nuevos productos Knauf", status: "in_progress", priority: "high" },
      { agentIdx: 1, title: "Preparar presentación técnica para constructoras", status: "pending", priority: "medium" },
      { agentIdx: 2, title: "Contactar distribuidores en Levante", status: "in_progress", priority: "high" },
      { agentIdx: 2, title: "Diseñar programa de fidelización instaladores", status: "pending", priority: "medium" },
      { agentIdx: 3, title: "Seguimiento propuesta Promotora Horizonte", status: "in_progress", priority: "urgent" },
      { agentIdx: 3, title: "Cualificar 5 leads nuevos del pipeline", status: "pending", priority: "high" },
      { agentIdx: 3, title: "Preparar demo para Constructora del Levante", status: "pending", priority: "medium" },
      { agentIdx: 4, title: "Revisar KPIs semanales del equipo", status: "in_progress", priority: "high" },
      { agentIdx: 4, title: "Preparar informe mensual para Dirección", status: "pending", priority: "high" },
    ];

    for (const task of taskTemplates) {
      await prisma.agentTask.create({
        data: {
          agentId: agents[task.agentIdx].id,
          title: task.title,
          status: task.status,
          priority: task.priority,
        },
      });
    }

    return NextResponse.json({
      success: true,
      counts: {
        agents: agents.length,
        leads: leads.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
