"use client";

import { useState } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

interface AgentEvent {
  type: string;
  agent?: { id: string; name: string; avatar: string; role?: string };
  summary?: string;
  actionsCount?: number;
  actionsSuccess?: number;
  actions?: { type: string; success: boolean }[];
  error?: string;
  progress?: number;
  round?: number;
  stats?: { leads: number; calls: number; logs: number };
}

interface Props {
  onComplete: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  new_lead: "Nuevo lead",
  update_lead: "Actualizar lead",
  log: "Registro",
  schedule_call: "Programar llamada",
  task: "Nueva tarea",
};

export default function ExecutionPanel({ onComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [rounds, setRounds] = useState(1);
  const [instruction, setInstruction] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [finalStats, setFinalStats] = useState<{ leads: number; calls: number; logs: number } | null>(null);

  async function startExecution() {
    const apiKey = localStorage.getItem("anthropic_api_key");
    if (!apiKey) {
      alert("Configura tu API key en Configuracion antes de ejecutar los agentes.");
      return;
    }

    setRunning(true);
    setEvents([]);
    setProgress(0);
    setFinalStats(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          rounds,
          instruction: instruction || undefined,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

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

            if (event.type === "agent_start") {
              setCurrentAgent(event.agent?.name || null);
            }

            if (event.progress !== undefined) {
              setProgress(event.progress);
            }

            if (event.type === "complete") {
              setFinalStats(event.stats || null);
            }

            if (["agent_start", "agent_done", "agent_error", "round_start", "complete"].includes(event.type)) {
              setEvents((prev) => [...prev, event]);
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setEvents((prev) => [...prev, { type: "error", error: String(err) }]);
    } finally {
      setRunning(false);
      setCurrentAgent(null);
      onComplete();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Centro de Control de Agentes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {running
              ? `Trabajando... ${currentAgent || ""}`
              : finalStats
                ? `Completado - ${finalStats.leads} leads, ${finalStats.calls} llamadas`
                : "Lanza un ciclo de trabajo para los agentes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {showConfig ? "Ocultar" : "Opciones"}
          </button>
          <button
            onClick={startExecution}
            disabled={running}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            {running ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                Trabajando...
              </>
            ) : (
              "Ejecutar agentes"
            )}
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && !running && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Instruccion para los agentes (opcional)
              </label>
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ej: Enfocarse en distribuidores de Levante..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-600 mb-1">Rondas</label>
              <select
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value={1}>1 ronda</option>
                <option value={2}>2 rondas</option>
                <option value={3}>3 rondas</option>
                <option value={5}>5 rondas</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Cada ronda ejecuta los 5 agentes en secuencia. Mas rondas = mas leads y mas progreso, pero tarda mas y consume mas API.
          </p>
        </div>
      )}

      {/* Progress bar */}
      {(running || events.length > 0) && (
        <div className="px-6 py-3 border-b border-gray-100">
          <ProgressBar value={progress} size="md" color={progress === 100 ? "bg-green-500" : "bg-blue-500"} />
        </div>
      )}

      {/* Event log */}
      {events.length > 0 && (
        <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-2">
          {events.map((event, i) => (
            <div key={i} className="animate-fadeIn">
              {event.type === "round_start" && (
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-xs font-medium text-gray-400">Ronda {event.round}</span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
              )}

              {event.type === "agent_start" && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-lg">{event.agent?.avatar}</span>
                  <span>{event.agent?.name}</span>
                  <span className="animate-pulse text-blue-500">analizando...</span>
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
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            a.success ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                          }`}
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

              {event.type === "complete" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center mt-2">
                  <p className="text-sm font-semibold text-gray-900">Ciclo completado</p>
                  <div className="flex justify-center gap-6 mt-2 text-sm text-gray-600">
                    <span>{event.stats?.leads} leads en pipeline</span>
                    <span>{event.stats?.calls} llamadas programadas</span>
                    <span>{event.stats?.logs} registros</span>
                  </div>
                </div>
              )}

              {event.type === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-red-700">{event.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
