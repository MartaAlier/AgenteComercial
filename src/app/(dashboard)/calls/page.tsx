"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newCall, setNewCall] = useState({
    leadId: "",
    scheduledAt: "",
    duration: 30,
    purpose: "",
  });

  async function loadCalls() {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    const [callsRes, leadsRes] = await Promise.all([
      fetch(`/api/calls${params}`),
      fetch("/api/leads"),
    ]);
    setCalls(await callsRes.json());
    setLeads(await leadsRes.json());
    setLoading(false);
  }

  async function createCall() {
    await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newCall,
        scheduledAt: new Date(newCall.scheduledAt).toISOString(),
      }),
    });
    setShowNew(false);
    setNewCall({ leadId: "", scheduledAt: "", duration: 30, purpose: "" });
    loadCalls();
  }

  async function updateCallStatus(id: string, status: string) {
    await fetch("/api/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadCalls();
  }

  useEffect(() => {
    loadCalls();
  }, [filter]);

  const upcoming = calls.filter((c) => c.status === "scheduled" && new Date(c.scheduledAt) >= new Date());
  const past = calls.filter((c) => c.status !== "scheduled" || new Date(c.scheduledAt) < new Date());

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
          <h1 className="text-3xl font-bold text-gray-900">Llamadas Programadas</h1>
          <p className="text-gray-500 mt-1">Agenda de llamadas del Director Comercial con prospectos</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + Programar Llamada
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {["", "scheduled", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "Todas" : s === "scheduled" ? "Programadas" : s === "completed" ? "Completadas" : "Canceladas"}
          </button>
        ))}
      </div>

      {/* Upcoming Calls */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Próximas Llamadas</h2>
          <div className="space-y-4">
            {upcoming.map((call) => (
              <Card key={call.id}>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{call.lead?.companyName}</h3>
                      <p className="text-sm text-gray-500">{call.lead?.contactName} · {call.lead?.contactPhone}</p>
                      <p className="text-sm text-gray-700 mt-2">{call.purpose}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span>📅 {formatDateTime(call.scheduledAt)}</span>
                        <span>⏱️ {call.duration} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge status={call.status} />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateCallStatus(call.id, "completed")}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                        >
                          Completada
                        </button>
                        <button
                          onClick={() => updateCallStatus(call.id, "cancelled")}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past/Other Calls */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Historial</h2>
          <div className="space-y-3">
            {past.map((call) => (
              <Card key={call.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{call.lead?.companyName}</h3>
                      <p className="text-xs text-gray-500">{call.purpose}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(call.scheduledAt)} · {call.duration}min</p>
                    </div>
                    <Badge status={call.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {calls.length === 0 && (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="text-center">
            <p className="text-4xl mb-3">📞</p>
            <p className="text-gray-500">No hay llamadas programadas</p>
          </div>
        </div>
      )}

      {/* New Call Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Programar Llamada</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead / Empresa *</label>
                <select
                  value={newCall.leadId}
                  onChange={(e) => setNewCall({ ...newCall, leadId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Seleccionar lead...</option>
                  {leads.map((lead: any) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.companyName} - {lead.contactName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
                  <input
                    type="datetime-local"
                    value={newCall.scheduledAt}
                    onChange={(e) => setNewCall({ ...newCall, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                  <input
                    type="number"
                    value={newCall.duration}
                    onChange={(e) => setNewCall({ ...newCall, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propósito *</label>
                <textarea
                  value={newCall.purpose}
                  onChange={(e) => setNewCall({ ...newCall, purpose: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Describe el propósito de la llamada..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={createCall}
                disabled={!newCall.leadId || !newCall.scheduledAt || !newCall.purpose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Programar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
