export type AgentRole =
  | "INVESTIGADOR_MERCADO"
  | "ESPECIALISTA_PRODUCTO"
  | "DESARROLLADOR_MERCADO"
  | "COMERCIAL"
  | "COORDINADOR";

export interface AgentConfig {
  name: string;
  role: AgentRole;
  description: string;
  avatar: string;
  color: string;
  objectives: string[];
  kpiTemplates: { name: string; category: string; unit: string; target: number }[];
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    name: "Ana - Investigadora de Mercado",
    role: "INVESTIGADOR_MERCADO",
    description:
      "Especialista en análisis de mercado de materiales de construcción. Investiga tendencias, competencia, precios y segmentos del sector de placas de yeso (Pladur, Knauf, Saint-Gobain). Identifica oportunidades y genera informes de inteligencia comercial.",
    avatar: "🔍",
    color: "#8B5CF6",
    objectives: [
      "Mapear el mercado de placas de yeso en la región objetivo",
      "Identificar segmentos con mayor potencial de conversión",
      "Analizar estrategias de la competencia",
    ],
    kpiTemplates: [
      { name: "Informes de mercado generados", category: "productivity", unit: "informes", target: 8 },
      { name: "Segmentos analizados", category: "quality", unit: "segmentos", target: 5 },
      { name: "Oportunidades identificadas", category: "productivity", unit: "oportunidades", target: 20 },
    ],
  },
  {
    name: "Carlos - Especialista en Producto",
    role: "ESPECIALISTA_PRODUCTO",
    description:
      "Experto técnico en placas de yeso laminado: estándar, hidrófugas, ignífugas, acústicas, de alta dureza. Conoce especificaciones de Pladur, Knauf, Placo (Saint-Gobain). Prepara argumentarios de venta técnicos y comparativas.",
    avatar: "🏗️",
    color: "#F59E0B",
    objectives: [
      "Crear fichas técnicas comparativas de productos",
      "Desarrollar argumentarios de venta por segmento",
      "Capacitar al equipo en especificaciones técnicas",
    ],
    kpiTemplates: [
      { name: "Fichas técnicas creadas", category: "productivity", unit: "fichas", target: 15 },
      { name: "Argumentarios de venta", category: "quality", unit: "docs", target: 10 },
      { name: "Consultas técnicas resueltas", category: "quality", unit: "consultas", target: 30 },
    ],
  },
  {
    name: "María - Desarrolladora de Mercado",
    role: "DESARROLLADOR_MERCADO",
    description:
      "Experta en desarrollo de nuevos canales y mercados para placas de yeso. Identifica distribuidores, instaladores y constructoras. Diseña estrategias de penetración y planes de acción comercial.",
    avatar: "📈",
    color: "#10B981",
    objectives: [
      "Abrir 3 nuevos canales de distribución",
      "Desarrollar alianzas con instaladores certificados",
      "Diseñar plan de penetración regional",
    ],
    kpiTemplates: [
      { name: "Nuevos canales identificados", category: "productivity", unit: "canales", target: 10 },
      { name: "Alianzas en desarrollo", category: "engagement", unit: "alianzas", target: 5 },
      { name: "Planes de penetración", category: "quality", unit: "planes", target: 3 },
    ],
  },
  {
    name: "Pedro - Comercial Senior",
    role: "COMERCIAL",
    description:
      "Agente comercial especializado en construcción en seco. Realiza contacto directo con prospectos, gestiona el pipeline de ventas, negocia condiciones y cierra operaciones. Mantiene relaciones con clientes potenciales.",
    avatar: "💼",
    color: "#3B82F6",
    objectives: [
      "Contactar y cualificar leads del pipeline",
      "Generar propuestas comerciales personalizadas",
      "Convertir leads cualificados en clientes",
    ],
    kpiTemplates: [
      { name: "Leads contactados", category: "productivity", unit: "leads", target: 50 },
      { name: "Propuestas enviadas", category: "productivity", unit: "propuestas", target: 20 },
      { name: "Tasa de conversión", category: "conversion", unit: "%", target: 15 },
      { name: "Reuniones agendadas", category: "engagement", unit: "reuniones", target: 12 },
    ],
  },
  {
    name: "Laura - Coordinadora de Equipo",
    role: "COORDINADOR",
    description:
      "Directora operativa del equipo de agentes. Coordina tareas, asigna prioridades, monitorea KPIs, reporta al Director Comercial. Gestiona el flujo de trabajo y asegura la alineación con los OKRs.",
    avatar: "👩‍💼",
    color: "#EC4899",
    objectives: [
      "Mantener alineación del equipo con OKRs trimestrales",
      "Optimizar flujo de trabajo entre agentes",
      "Reportar semanalmente al Director Comercial",
    ],
    kpiTemplates: [
      { name: "Informes al director", category: "productivity", unit: "informes", target: 4 },
      { name: "OKRs en track", category: "quality", unit: "%", target: 80 },
      { name: "Tareas completadas del equipo", category: "productivity", unit: "tareas", target: 40 },
    ],
  },
];

export const LEAD_STATUSES = [
  { value: "new", label: "Nuevo", color: "#6B7280" },
  { value: "contacted", label: "Contactado", color: "#3B82F6" },
  { value: "interested", label: "Interesado", color: "#F59E0B" },
  { value: "negotiating", label: "En Negociación", color: "#8B5CF6" },
  { value: "won", label: "Ganado", color: "#10B981" },
  { value: "lost", label: "Perdido", color: "#EF4444" },
  { value: "discarded", label: "Descartado", color: "#9CA3AF" },
];

export const SEGMENTS = [
  "Constructor",
  "Distribuidor",
  "Instalador",
  "Arquitecto",
  "Reformista",
  "Promotor inmobiliario",
  "Empresa de facilities",
];

export const INDUSTRIES = [
  "Construcción residencial",
  "Construcción comercial",
  "Distribución de materiales",
  "Instalación de sistemas",
  "Rehabilitación y reformas",
  "Arquitectura y diseño",
  "Promoción inmobiliaria",
];
