export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "hace unos segundos";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return formatDate(date);
}

export function progressColor(value: number): string {
  if (value >= 75) return "bg-green-500";
  if (value >= 50) return "bg-yellow-500";
  if (value >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export function statusBadgeColor(status: string): string {
  const map: Record<string, string> = {
    new: "bg-gray-100 text-gray-700",
    contacted: "bg-blue-100 text-blue-700",
    interested: "bg-yellow-100 text-yellow-700",
    negotiating: "bg-purple-100 text-purple-700",
    won: "bg-green-100 text-green-700",
    lost: "bg-red-100 text-red-700",
    discarded: "bg-gray-100 text-gray-400",
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    offline: "bg-gray-100 text-gray-500",
    on_track: "bg-green-100 text-green-700",
    at_risk: "bg-yellow-100 text-yellow-700",
    behind: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
    scheduled: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    blocked: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    new: "Nuevo",
    contacted: "Contactado",
    interested: "Interesado",
    negotiating: "En Negociación",
    won: "Ganado",
    lost: "Perdido",
    discarded: "Descartado",
    active: "Activo",
    paused: "Pausado",
    offline: "Desconectado",
    on_track: "En curso",
    at_risk: "En riesgo",
    behind: "Retrasado",
    completed: "Completado",
    scheduled: "Programada",
    cancelled: "Cancelada",
    rescheduled: "Reprogramada",
    no_show: "No presentado",
    pending: "Pendiente",
    in_progress: "En progreso",
    blocked: "Bloqueada",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
  };
  return map[status] || status;
}

export function translateRole(role: string): string {
  const map: Record<string, string> = {
    INVESTIGADOR_MERCADO: "Investigador de Mercado",
    ESPECIALISTA_PRODUCTO: "Especialista en Producto",
    DESARROLLADOR_MERCADO: "Desarrollador de Mercado",
    COMERCIAL: "Comercial",
    COORDINADOR: "Coordinador",
  };
  return map[role] || role;
}
