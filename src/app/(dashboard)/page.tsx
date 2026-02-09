"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

interface AgentEvent {
  type: string;
  agent?: { id: string; name: string; avatar: string; role?: string };
  summary?: string;
  actionsCount?: number;
  actionsSuccess?: number;
  actions?: { type: string; success: boolean }[];
  error?: string;
  round?: number;
  stats?: { leads: number; logs: number };
  okrProgress?: number;
  okrsComplete?: boolean;
}

type AppPhase = "loading" | "setup" | "running" | "completed";

const ACTION_LABELS: Record<string, string> = {
  new_lead: "Nuevo lead",
  update_lead: "Actualizar lead",
  log: "Registro",
  task: "Nueva tarea",
};

export default function DashboardPage() {
  const [phase, setPhase] = useState<AppPhase>("loading");
  const [apiKey, setApiKey] = useState("");
  const [hasEnvKey, setHasEnvKey] = useState(false);
  const [manualKey, setManualKey] = useState("");

  // Setup form
  const [country, setCountry] = useState("España");
  const [city, setCity] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");

  // Execution
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [okrProgress, setOkrProgress] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const stopRef = useRef(false);

  // Stats for completed phase
  const [finalStats, setFinalStats] = useState<any>(null);

  // On mount: reset data + check for API key
  useEffect(() => {
    async function init() {
      try {
        // Always reset data on startup
        await fetch("/api/reset", { method: "POST" });

        // Check for env-based API key
        const configRes = await fetch("/api/config");
        const config = await configRes.json();
        if (config.hasApiKey) {
          setApiKey(config.apiKey);
          setHasEnvKey(true);
        } else {
          // Check localStorage fallback
          const stored = localStorage.getItem("anthropic_api_key");
          if (stored) {
            setApiKey(stored);
            setManualKey(stored);
          }
        }
      } catch (e) {
        console.error("Init error:", e);
      }
      setPhase("setup");
    }
    init();
  }, []);

  const runOneRound = useCallback(async (key: string, location: string): Promise<{ success: boolean; okrsComplete: boolean }> => {
    return new Promise((resolve) => {
      let roundOkrsComplete = false;
      fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: key,
          rounds: 1,
          instruction: `UBICACIÓN OBJETIVO: ${location}. Busca leads, empresas, contactos y oportunidades en esta zona geográfica. ${customInstruction}`.trim(),
        }),
      })
        .then(async (res) => {
          const reader = res.body?.getReader();
          if (!reader) {
            resolve({ success: false, okrsComplete: false });
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const event: AgentEvent = JSON.parse(line.slice(6));
                if (event.type === "agent_start") setCurrentAgent(event.agent?.name || null);
                if (event.type === "complete") {
                  if (event.stats) {
                    setTotalLeads(event.stats.leads);
                    setTotalLogs(event.stats.logs);
                  }
                }
                if (event.type === "round_end") {
                  if (event.okrProgress !== undefined) setOkrProgress(event.okrProgress);
                  if (event.okrsComplete) {
                    roundOkrsComplete = true;
                  }
                }
                if (["agent_done", "agent_error", "round_end"].includes(event.type)) {
                  setEvents((prev) => [...prev.slice(-80), event]);
                }
              } catch {
                /* skip */
              }
            }
          }
          resolve({ success: true, okrsComplete: roundOkrsComplete });
        })
        .catch(() => resolve({ success: false, okrsComplete: false }));
    });
  }, [customInstruction]);

  async function startAgents() {
    const key = apiKey || manualKey;
    if (!key) {
      alert("Necesitas una API key de Anthropic para ejecutar los agentes.");
      return;
    }
    if (!manualKey && !hasEnvKey) {
      // Save manual key
      localStorage.setItem("anthropic_api_key", manualKey);
    }

    const location = city ? `${city}, ${country}` : country;

    setPhase("running");
    setEvents([]);
    setCurrentRound(0);
    setOkrProgress(0);
    setTotalLeads(0);
    setTotalLogs(0);
    stopRef.current = false;

    const maxRounds = 50;
    for (let r = 1; r <= maxRounds; r++) {
      if (stopRef.current) break;
      setCurrentRound(r);
      setEvents((prev) => [...prev, { type: "round_start", round: r }]);
      const result = await runOneRound(key, location);

      if (result.okrsComplete) {
        setEvents((prev) => [...prev, { type: "okrs_complete" }]);
        break;
      }

      // Pause between rounds
      await new Promise((res) => setTimeout(res, 1500));
    }

    // Load final stats for completion screen
    try {
      const statsRes = await fetch("/api/stats");
      const stats = await statsRes.json();
      setFinalStats(stats);
    } catch {
      /* ok */
    }

    setPhase("completed");
    setCurrentAgent(null);
  }

  function stopExecution() {
    stopRef.current = true;
  }

  function downloadExcel() {
    window.open("/api/export", "_blank");
  }

  function startOver() {
    setPhase("loading");
    setEvents([]);
    setFinalStats(null);
    setOkrProgress(0);
    // Re-init
    fetch("/api/reset", { method: "POST" }).then(() => setPhase("setup"));
  }

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-500 text-lg">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  // ── SETUP: Select country/city ──
  if (phase === "setup") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">AgenteComercial</h1>
            <p className="text-gray-500 text-lg">
              Equipo de agentes IA para generar leads de placas de yeso
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pais objetivo
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="España">España</option>
                <option value="México">Mexico</option>
                <option value="Argentina">Argentina</option>
                <option value="Colombia">Colombia</option>
                <option value="Chile">Chile</option>
                <option value="Perú">Peru</option>
                <option value="Francia">Francia</option>
                <option value="Portugal">Portugal</option>
                <option value="Italia">Italia</option>
                <option value="Alemania">Alemania</option>
                <option value="Reino Unido">Reino Unido</option>
                <option value="Estados Unidos">Estados Unidos</option>
                <option value="Brasil">Brasil</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ciudad o region (opcional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Madrid, Barcelona, Valencia..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Instrucciones adicionales (opcional)
              </label>
              <textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Ej: Enfocarse en distribuidores grandes, buscar constructoras de obra nueva..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* API Key section - only if not from env */}
            {!hasEnvKey && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Key de Anthropic
                </label>
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => {
                    setManualKey(e.target.value);
                    setApiKey(e.target.value);
                  }}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Obtener en console.anthropic.com. Se guarda solo en tu navegador.
                </p>
              </div>
            )}

            {hasEnvKey && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                <span>API key configurada desde el servidor</span>
              </div>
            )}

            <button
              onClick={startAgents}
              disabled={!apiKey && !manualKey}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Lanzar Agentes
            </button>

            <p className="text-xs text-center text-gray-400">
              Los 5 agentes trabajaran autonomamente hasta completar todos sus KPIs
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── RUNNING: Agents executing ──
  if (phase === "running") {
    return (
      <div className="animate-fadeIn max-w-4xl mx-auto">
        {/* Header with stop */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agentes trabajando...</h1>
            <p className="text-gray-500 mt-1">
              {city ? `${city}, ${country}` : country} &middot; Ronda {currentRound} &middot; {currentAgent || "iniciando..."}
            </p>
          </div>
          <button
            onClick={stopExecution}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors"
          >
            Detener
          </button>
        </div>

        {/* OKR Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Progreso hacia objetivos (KPIs)</span>
            <span className="text-2xl font-bold text-blue-600">{okrProgress}%</span>
          </div>
          <ProgressBar value={okrProgress} size="lg" color={okrProgress >= 100 ? "bg-green-500" : "bg-blue-500"} />
          <div className="flex gap-6 mt-3 text-sm text-gray-500">
            <span>{totalLeads} leads generados</span>
            <span>{totalLogs} registros de actividad</span>
            <span>Ronda {currentRound}</span>
          </div>
        </div>

        {/* Live event log */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Actividad en tiempo real</h3>
          </div>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-2">
            {events.map((event, i) => (
              <div key={i} className="animate-fadeIn">
                {event.type === "round_start" && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-xs font-medium text-gray-400">Ronda {event.round}</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                )}

                {event.type === "agent_done" && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{event.agent?.avatar}</span>
                      <span className="text-sm font-medium text-gray-900">{event.agent?.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {event.actionsSuccess}/{event.actionsCount} acciones
                      </span>
                    </div>
                    {event.summary && (
                      <p className="text-xs text-gray-600 ml-8 mb-1">{event.summary.slice(0, 200)}</p>
                    )}
                    {event.actions && event.actions.length > 0 && (
                      <div className="ml-8 flex flex-wrap gap-1">
                        {event.actions.map((a, j) => (
                          <span
                            key={j}
                            className={`text-xs px-2 py-0.5 rounded-full ${a.success ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}
                          >
                            {ACTION_LABELS[a.type] || a.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {event.type === "agent_error" && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{event.agent?.avatar}</span>
                      <span className="text-sm font-medium text-red-700">{event.agent?.name} - Error</span>
                    </div>
                    <p className="text-xs text-red-600 ml-8 mt-1">{event.error}</p>
                  </div>
                )}

                {event.type === "round_end" && event.okrProgress !== undefined && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-3 text-xs">
                      <span className="text-indigo-600 font-medium">Progreso KPIs: {event.okrProgress}%</span>
                      <div className="w-32 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(event.okrProgress, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {event.type === "okrs_complete" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm font-semibold text-green-700">
                      Todos los KPIs han sido completados
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETED: Show summary and download Excel ──
  if (phase === "completed") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-2xl text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">&#10003;</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Trabajo completado</h1>
            <p className="text-gray-500 text-lg">
              Los agentes han terminado de trabajar en {city ? `${city}, ${country}` : country}
            </p>
          </div>

          {/* Final stats */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-3xl font-bold text-blue-600">{totalLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Leads generados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{okrProgress}%</p>
                <p className="text-sm text-gray-500 mt-1">KPIs completados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{currentRound}</p>
                <p className="text-sm text-gray-500 mt-1">Rondas ejecutadas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">{totalLogs}</p>
                <p className="text-sm text-gray-500 mt-1">Registros actividad</p>
              </div>
            </div>

            {finalStats && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {finalStats.leads?.byStatus && Object.entries(finalStats.leads.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 capitalize">{status}</span>
                      <span className="font-semibold text-gray-900">{count as number}</span>
                    </div>
                  ))}
                </div>
                {finalStats.leads?.pipelineValue > 0 && (
                  <p className="text-sm text-gray-500 mt-4">
                    Valor estimado del pipeline: <span className="font-semibold text-gray-900">{(finalStats.leads.pipelineValue / 1000).toFixed(0)}K</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={downloadExcel}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Descargar Excel completo
            </button>
            <button
              onClick={startOver}
              className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-lg font-semibold transition-all"
            >
              Nueva busqueda
            </button>
          </div>

          {/* Event summary */}
          {events.length > 0 && (
            <details className="mt-8 text-left">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600 text-center">
                Ver log de actividad ({events.filter((e) => e.type === "agent_done").length} acciones completadas)
              </summary>
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 max-h-80 overflow-y-auto space-y-2">
                {events
                  .filter((e) => e.type === "agent_done")
                  .map((event, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span>{event.agent?.avatar}</span>
                        <span className="text-sm font-medium">{event.agent?.name}</span>
                        <span className="text-xs text-gray-400">
                          {event.actionsSuccess}/{event.actionsCount} acciones
                        </span>
                      </div>
                      {event.summary && (
                        <p className="text-xs text-gray-500 ml-7 mt-1">{event.summary.slice(0, 150)}</p>
                      )}
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return null;
}
