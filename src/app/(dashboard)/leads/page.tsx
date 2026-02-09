"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LEAD_STATUSES, SEGMENTS } from "@/lib/agents-config";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState({ status: "", segment: "", search: "" });
  const [loading, setLoading] = useState(true);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLead, setNewLead] = useState({
    companyName: "", contactName: "", contactEmail: "", contactPhone: "",
    position: "", industry: "", segment: "", region: "", source: "", priority: "medium",
  });

  async function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.segment) params.set("segment", filter.segment);
    if (filter.search) params.set("search", filter.search);
    const res = await fetch(`/api/leads?${params}`);
    setLeads(await res.json());
    setLoading(false);
  }

  async function loadLeadDetail(id: string) {
    const res = await fetch(`/api/leads/${id}`);
    setSelected(await res.json());
  }

  async function createLead() {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLead),
    });
    setShowNewLead(false);
    setNewLead({
      companyName: "", contactName: "", contactEmail: "", contactPhone: "",
      position: "", industry: "", segment: "", region: "", source: "", priority: "medium",
    });
    loadLeads();
  }

  async function updateLeadStatus(id: string, status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadLeads();
    if (selected?.id === id) loadLeadDetail(id);
  }

  useEffect(() => {
    loadLeads();
  }, [filter.status, filter.segment]);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">Pipeline de ventas de placas de yeso</p>
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + Nuevo Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Todos los estados</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filter.segment}
          onChange={(e) => setFilter({ ...filter, segment: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Todos los segmentos</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar empresa o contacto..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && loadLeads()}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
        />
        <button onClick={loadLeads} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
          Buscar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead List */}
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : leads.length === 0 ? (
            <p className="text-center py-12 text-gray-500">No se encontraron leads</p>
          ) : (
            leads.map((lead) => (
              <Card
                key={lead.id}
                onClick={() => loadLeadDetail(lead.id)}
                className={selected?.id === lead.id ? "ring-2 ring-blue-500" : ""}
              >
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{lead.companyName}</h3>
                      <p className="text-xs text-gray-500">{lead.contactName} · {lead.segment}</p>
                      <p className="text-xs text-gray-400">{lead.region}</p>
                    </div>
                    <div className="text-right ml-2">
                      <Badge status={lead.status} />
                      <p className="text-xs text-gray-500 mt-1">Score: {lead.score}</p>
                      {lead.estimatedValue && (
                        <p className="text-xs font-semibold text-green-600">€{lead.estimatedValue.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Lead Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selected.companyName}</h2>
                      <p className="text-sm text-gray-500">{selected.segment} · {selected.industry}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={selected.priority} />
                      <Badge status={selected.status} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Contacto</p>
                      <p className="font-medium">{selected.contactName}</p>
                      <p className="text-gray-600">{selected.position}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Datos de contacto</p>
                      <p className="text-gray-600">{selected.contactEmail}</p>
                      <p className="text-gray-600">{selected.contactPhone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Región</p>
                      <p className="font-medium">{selected.region}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Valor estimado</p>
                      <p className="font-medium text-green-600">
                        {selected.estimatedValue ? `€${selected.estimatedValue.toLocaleString()}` : "Sin estimar"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Score</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${selected.score}%` }} />
                        </div>
                        <span className="font-medium">{selected.score}/100</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500">Fuente</p>
                      <p className="font-medium">{selected.source}</p>
                    </div>
                  </div>

                  {/* Status change buttons */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Cambiar estado:</p>
                    <div className="flex flex-wrap gap-2">
                      {LEAD_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => updateLeadStatus(selected.id, s.value)}
                          disabled={selected.status === s.value}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            selected.status === s.value
                              ? "bg-gray-200 text-gray-400 cursor-default"
                              : "hover:bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Llamadas Programadas */}
              {selected.scheduledCalls?.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900">Llamadas Programadas</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selected.scheduledCalls.map((call: any) => (
                        <div key={call.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium">{call.purpose}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(call.scheduledAt)} · {call.duration}min</p>
                          </div>
                          <Badge status={call.status} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Historial de Acciones */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Historial de Acciones</h3>
                </CardHeader>
                <CardContent>
                  {selected.actions?.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin acciones registradas</p>
                  ) : (
                    <div className="space-y-4">
                      {selected.actions?.map((action: any) => (
                        <div key={action.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0">
                          <span className="text-lg">{action.agent?.avatar}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{action.summary}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{action.agent?.name}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-400">{timeAgo(action.createdAt)}</span>
                              {action.result && (
                                <>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className={`text-xs ${
                                    action.result === "positive" ? "text-green-600" :
                                    action.result === "negative" ? "text-red-600" : "text-gray-500"
                                  }`}>
                                    {action.result === "positive" ? "Positivo" :
                                     action.result === "negative" ? "Negativo" : "Neutral"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
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
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-gray-500">Selecciona un lead para ver su detalle</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Lead Modal */}
      {showNewLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nuevo Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                <input
                  type="text" value={newLead.companyName}
                  onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                  <input
                    type="text" value={newLead.contactName}
                    onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <input
                    type="text" value={newLead.position}
                    onChange={(e) => setNewLead({ ...newLead, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email" value={newLead.contactEmail}
                    onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text" value={newLead.contactPhone}
                    onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                  <select
                    value={newLead.segment}
                    onChange={(e) => setNewLead({ ...newLead, segment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Seleccionar</option>
                    {SEGMENTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                  <input
                    type="text" value={newLead.region}
                    onChange={(e) => setNewLead({ ...newLead, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
                <input
                  type="text" value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewLead(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={createLead}
                disabled={!newLead.companyName}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Crear Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
