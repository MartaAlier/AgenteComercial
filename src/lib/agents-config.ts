export type AgentRole =
  | "BUSCADOR_DISTRIBUIDORES"
  | "BUSCADOR_MAYORISTAS"
  | "BUSCADOR_CONSTRUCTORAS"
  | "BUSCADOR_TELEFONOS"
  | "BUSCADOR_LINKEDIN";

export interface AgentConfig {
  name: string;
  role: AgentRole;
  description: string;
  avatar: string;
  color: string;
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    name: "Agente Distribuidores",
    role: "BUSCADOR_DISTRIBUIDORES",
    description:
      "Busca pequeños distribuidores y tiendas de materiales de construcción que vendan placas de yeso, perfilería, pastas y accesorios para construcción en seco.",
    avatar: "🏪",
    color: "#3B82F6",
  },
  {
    name: "Agente Mayoristas",
    role: "BUSCADOR_MAYORISTAS",
    description:
      "Busca grandes mayoristas, almacenes de distribución a gran escala y cadenas de materiales de construcción que operen con volúmenes importantes.",
    avatar: "🏭",
    color: "#8B5CF6",
  },
  {
    name: "Agente Constructoras",
    role: "BUSCADOR_CONSTRUCTORAS",
    description:
      "Busca grandes empresas constructoras, promotoras inmobiliarias y empresas de reformas que utilicen placas de yeso en sus proyectos.",
    avatar: "🏗️",
    color: "#F59E0B",
  },
  {
    name: "Agente Teléfonos",
    role: "BUSCADOR_TELEFONOS",
    description:
      "Enriquece los leads existentes buscando teléfonos de contacto, emails corporativos, direcciones y links de Google Maps.",
    avatar: "📞",
    color: "#10B981",
  },
  {
    name: "Agente LinkedIn",
    role: "BUSCADOR_LINKEDIN",
    description:
      "Busca los contactos clave de cada empresa en LinkedIn: directores comerciales, gerentes, jefes de compras, responsables de obra.",
    avatar: "💼",
    color: "#0A66C2",
  },
];

export const COMPANY_TYPES = [
  { value: "pequeño_distribuidor", label: "Pequeño Distribuidor" },
  { value: "gran_mayorista", label: "Gran Mayorista" },
  { value: "gran_constructora", label: "Gran Constructora" },
  { value: "otro", label: "Otro" },
];
