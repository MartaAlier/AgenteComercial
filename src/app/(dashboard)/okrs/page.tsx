"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

export default function OKRsPage() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const params = selectedAgent ? `?agentId=${selectedAgent}` : "";
    const [okrsRes, kpisRes, agentsRes] = await Promise.all([
      fetch(`/api/okrs${params}`),
      fetch(`/api/kpis${params}`),
      fetch("/api/agents"),
    ]);
    setObjectives(await okrsRes.json());
    setKpis(await kpisRes.json());
    setAgents(await agentsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedAgent]);

  const teamObjectives = objectives.filter((o) => !o.agentId);
  const agentObjectives = objectives.filter((o) => o.agentId);
  const avgProgress = objectives.length
    ? Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length)
    : 0;

  // Group KPIs by agent
  const kpisByAgent: Record<string, any[]> = {};
  kpis.forEach((kpi) => {
    const key = kpi.agent?.name || "Sin asignar";
    if (!kpisByAgent[key]) kpisByAgent[key] = [];
    kpisByAgent[key].push(kpi);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OKRs & KPIs</h1>
          <p className="text-gray-500 mt-1">Objetivos, resultados clave e indicadores de rendimiento</p>
        </div>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Todos los agentes</option>
          {agents.map((a: any) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Progreso General OKRs</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{avgProgress}%</p>
            <ProgressBar value={avgProgress} size="sm" showPercent={false} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Objetivos Totales</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{objectives.length}</p>
            <p className="text-xs text-gray-400 mt-1">{teamObjectives.length} de equipo · {agentObjectives.length} individuales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">KPIs Activos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              {kpis.filter((k) => k.currentValue >= k.targetValue).length} cumplidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Objectives */}
      {teamObjectives.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Objetivos de Equipo</h2>
          <div className="space-y-4">
            {teamObjectives.map((obj) => (
              <Card key={obj.id}>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{obj.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{obj.quarter}</span>
                      <Badge status={obj.status} />
                    </div>
                  </div>
                  <ProgressBar value={obj.progress} size="md" />
                  <div className="mt-4 space-y-3">
                    {obj.keyResults.map((kr: any) => (
                      <div key={kr.id} className="ml-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{kr.title}</span>
                          <span className="text-sm font-semibold">
                            {kr.currentValue}/{kr.targetValue} {kr.unit}
                          </span>
                        </div>
                        <ProgressBar value={kr.progress} size="sm" showPercent={false} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Agent Objectives */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Objetivos por Agente</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {agentObjectives.map((obj) => (
          <Card key={obj.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{obj.agent?.avatar}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{obj.title}</h3>
                    <p className="text-xs text-gray-500">{obj.agent?.name}</p>
                  </div>
                </div>
                <Badge status={obj.status} />
              </div>
            </CardHeader>
            <CardContent className="py-3">
              <ProgressBar value={obj.progress} size="sm" />
              <div className="mt-3 space-y-2">
                {obj.keyResults.map((kr: any) => (
                  <div key={kr.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate mr-2">{kr.title}</span>
                    <span className="text-gray-500 whitespace-nowrap">
                      {kr.currentValue}/{kr.targetValue} {kr.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">KPIs Individuales</h2>
      <div className="space-y-6">
        {Object.entries(kpisByAgent).map(([agentName, agentKpis]) => (
          <Card key={agentName}>
            <CardHeader className="py-3">
              <h3 className="font-semibold text-gray-900">{agentName}</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentKpis.map((kpi: any) => {
                  const pct = Math.round((kpi.currentValue / kpi.targetValue) * 100);
                  return (
                    <div key={kpi.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">{kpi.name}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-gray-900">{kpi.currentValue}</span>
                        <span className="text-sm text-gray-500">/ {kpi.targetValue} {kpi.unit}</span>
                      </div>
                      <ProgressBar value={pct} size="sm" showPercent={false} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
