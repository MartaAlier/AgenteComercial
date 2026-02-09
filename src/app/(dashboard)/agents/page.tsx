"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { translateRole } from "@/lib/utils";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agentes</h1>
        <p className="text-gray-500 mt-1">Equipo de ventas especializado en placas de yeso</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="space-y-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              onClick={() => setSelected(agent)}
              className={selected?.id === agent.id ? "ring-2 ring-blue-500" : ""}
            >
              <CardContent>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{agent.avatar}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{translateRole(agent.role)}</p>
                    <div className="flex gap-2">
                      <Badge status={agent.status} />
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-gray-500">
                      <span>{agent._count.logs} logs</span>
                      <span>{agent._count.leadActions} acciones</span>
                      <span>{agent._count.tasks} tareas</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-6">
              {/* Agent Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{selected.avatar}</span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                      <p className="text-sm text-gray-500">{translateRole(selected.role)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
                </CardContent>
              </Card>

              {/* KPIs */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">KPIs del Mes</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selected.kpis.map((kpi: any) => (
                      <div key={kpi.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700">{kpi.name}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                          </span>
                        </div>
                        <ProgressBar
                          value={kpi.currentValue}
                          max={kpi.targetValue}
                          showPercent={false}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* OKRs */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Objetivos (OKRs)</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {selected.objectives.map((obj: any) => (
                      <div key={obj.id}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{obj.title}</h4>
                          <Badge status={obj.status} />
                        </div>
                        <ProgressBar value={obj.progress} size="sm" />
                        <div className="mt-2 space-y-2">
                          {obj.keyResults.map((kr: any) => (
                            <div key={kr.id} className="ml-4 flex items-center justify-between text-xs">
                              <span className="text-gray-600">{kr.title}</span>
                              <span className="text-gray-500">
                                {kr.currentValue}/{kr.targetValue} {kr.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Tasks */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Tareas Activas</h3>
                </CardHeader>
                <CardContent>
                  {selected.tasks.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay tareas activas</p>
                  ) : (
                    <div className="space-y-3">
                      {selected.tasks.map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm text-gray-900">{task.title}</p>
                            <Badge status={task.priority} />
                          </div>
                          <Badge status={task.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-gray-200">
              <div className="text-center">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-gray-500">Selecciona un agente para ver su detalle</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
