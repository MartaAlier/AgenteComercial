"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/ui/StatCard";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";
import { timeAgo, translateRole } from "@/lib/utils";

interface Stats {
  leads: { total: number; byStatus: Record<string, number>; pipelineValue: number };
  agents: { total: number; active: number };
  activity: { totalLogs: number };
  calls: { total: number; upcoming: number };
  okrs: { avgProgress: number; byStatus: Record<string, number> };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, agentsRes, logsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/agents"),
        fetch("/api/logs?limit=10"),
      ]);
      setStats(await statsRes.json());
      setAgents(await agentsRes.json());
      setLogs(await logsRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function seedData() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    await loadData();
    setSeeding(false);
  }

  async function runAgents() {
    const key = localStorage.getItem("anthropic_api_key");
    if (!key) {
      alert("Configura tu API key de Anthropic en Configuracion antes de ejecutar los agentes.");
      return;
    }
    setExecuting(true);
    try {
      await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      await loadData();
    } finally {
      setExecuting(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.leads.total === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-6xl mb-4">🚀</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido a AgenteComercial</h2>
          <p className="text-gray-500 mb-6">Plataforma de gestión de equipo de ventas para placas de yeso</p>
          <button
            onClick={seedData}
            disabled={seeding}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {seeding ? "Inicializando..." : "Inicializar datos de demostración"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Vista general del equipo de ventas</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={runAgents}
            disabled={executing}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            {executing ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                Agentes trabajando...
              </>
            ) : (
              "Ejecutar agentes"
            )}
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Leads en Pipeline"
          value={stats.leads.total}
          subtitle={`${stats.leads.byStatus?.interested || 0} interesados`}
          icon={<span className="text-xl">🎯</span>}
          color="blue"
        />
        <StatCard
          title="Valor del Pipeline"
          value={`€${(stats.leads.pipelineValue / 1000).toFixed(0)}K`}
          subtitle="Valor estimado total"
          icon={<span className="text-xl">💰</span>}
          color="green"
        />
        <StatCard
          title="Llamadas Programadas"
          value={stats.calls.upcoming}
          subtitle={`${stats.calls.total} total`}
          icon={<span className="text-xl">📞</span>}
          color="purple"
        />
        <StatCard
          title="Progreso OKRs"
          value={`${stats.okrs.avgProgress}%`}
          subtitle="Progreso medio del equipo"
          icon={<span className="text-xl">📈</span>}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pipeline por Estado */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Pipeline por Estado</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.leads.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge status={status} />
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agentes Activos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Equipo de Agentes</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.map((agent: any) => (
                <div key={agent.id} className="flex items-center gap-4">
                  <span className="text-2xl">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                      <Badge status={agent.status} />
                    </div>
                    <p className="text-xs text-gray-500">{translateRole(agent.role)}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{agent._count.leadActions} acciones</p>
                    <p>{agent._count.tasks} tareas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actividad Reciente y OKRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0">
                  <span className="text-lg mt-0.5">{log.agent?.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{log.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.agent?.name} · {timeAgo(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* OKRs del equipo */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Progreso OKRs por Agente</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.map((agent: any) => {
                const avgProgress = agent.objectives.length
                  ? Math.round(
                      agent.objectives.reduce((s: number, o: any) => s + o.progress, 0) /
                        agent.objectives.length
                    )
                  : 0;
                return (
                  <div key={agent.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{agent.avatar}</span>
                      <span className="text-sm font-medium text-gray-700">{agent.name.split(" - ")[0]}</span>
                    </div>
                    <ProgressBar value={avgProgress} size="sm" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
