"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "research", label: "Investigación" },
  { value: "outreach", label: "Contacto" },
  { value: "analysis", label: "Análisis" },
  { value: "planning", label: "Planificación" },
  { value: "reporting", label: "Reportes" },
  { value: "system", label: "Sistema" },
];

const CATEGORY_COLORS: Record<string, string> = {
  research: "bg-purple-100 text-purple-700",
  outreach: "bg-blue-100 text-blue-700",
  analysis: "bg-yellow-100 text-yellow-700",
  planning: "bg-green-100 text-green-700",
  reporting: "bg-pink-100 text-pink-700",
  system: "bg-gray-100 text-gray-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  research: "Investigación",
  outreach: "Contacto",
  analysis: "Análisis",
  planning: "Planificación",
  reporting: "Reportes",
  system: "Sistema",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [filters, setFilters] = useState({ agentId: "", category: "" });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.agentId) params.set("agentId", filters.agentId);
    if (filters.category) params.set("category", filters.category);
    params.set("limit", "100");

    const [logsRes, agentsRes] = await Promise.all([
      fetch(`/api/logs?${params}`),
      fetch("/api/agents"),
    ]);
    setLogs(await logsRes.json());
    setAgents(await agentsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [filters]);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Actividad</h1>
          <p className="text-gray-500 mt-1">Log completo de todas las acciones de los agentes</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
        >
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filters.agentId}
          onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Todos los agentes</option>
          {agents.map((a: any) => (
            <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilters({ ...filters, category: cat.value })}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                filters.category === cat.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No hay registros con estos filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              <CardContent className="py-3">
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5">{log.agent?.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{log.agent?.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[log.category] || "bg-gray-100 text-gray-600"}`}>
                        {CATEGORY_LABELS[log.category] || log.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{log.action}</p>
                    {expanded === log.id && log.details && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 leading-relaxed animate-fadeIn">
                        {log.details}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
                    {log.details && (
                      <p className="text-xs text-blue-500 mt-1">{expanded === log.id ? "Menos" : "Más"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
