"use client";

import { useState, useRef } from "react";
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
  stats?: { leads: number; logs: number };
  okrProgress?: number;
  okrsComplete?: boolean;
}

interface Props {
  onComplete: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  new_lead: "Nuevo lead",
  update_lead: "Actualizar lead",
  log: "Registro",
  task: "Nueva tarea",
};

export default function ExecutionPanel({ onComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [rounds, setRounds] = useState(3);
  const [instruction, setInstruction] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [finalStats, setFinalStats] = useState<{ leads: number; logs: number } | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [okrProgress, setOkrProgress] = useState(0);
  const [okrsComplete, setOkrsComplete] = useState(false);
  const stopRef = useRef(false);

  async function runOneRound(apiKey: string): Promise<{ success: boolean; okrsComplete: boolean }> {
    return new Promise((resolve) => {
      let roundOkrsComplete = false;
      fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          rounds: 1,
          instruction: instruction || undefined,
        }),
      }).then(async (res) => {
        const reader = res.body?.getReader();
        if (!reader) { resolve({ success: false, okrsComplete: false }); return; }

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
              if (event.type === "complete") setFinalStats(event.stats || null);
              if (event.type === "round_end") {
                if (event.okrProgress !== undefined) setOkrProgress(event.okrProgress);
                if (event.okrsComplete) {
                  roundOkrsComplete = true;
                  setOkrsComplete(true);
                }
              }
              if (["agent_done", "agent_error", "complete", "round_end"].includes(event.type)) {
                setEvents((prev) => [...prev.slice(-50), event]); // keep last 50
              }
            } catch { /* skip */ }
          }
        }
        resolve({ success: true, okrsComplete: roundOkrsComplete });
      }).catch(() => resolve({ success: false, okrsComplete: false }));
    });
  }

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
    setOkrsComplete(false);
    setOkrProgress(0);
    stopRef.current = false;

    if (autoMode) {
      // Auto mode: run until OKRs complete or stopped, up to 50 rounds max
      const maxRounds = 50;
      for (let r = 1; r <= maxRounds; r++) {
        if (stopRef.current) break;
        setCurrentRound(r);
        setProgress(Math.round((r / maxRounds) * 100));
        setEvents((prev) => [...prev, { type: "round_start", round: r }]);
        const result = await runOneRound(apiKey);
        onComplete(); // refresh dashboard data between rounds

        // Auto-stop if OKRs are complete
        if (result.okrsComplete) {
          setEvents((prev) => [...prev, { type: "okrs_complete" }]);
          break;
        }

        // Small pause between rounds
        await new Promise((res) => setTimeout(res, 1000));
      }
    } else {
      // Manual mode: run specified rounds
      for (let r = 1; r <= rounds; r++) {
        if (stopRef.current) break;
        setCurrentRound(r);
        setProgress(Math.round((r / rounds) * 100));
        setEvents((prev) => [...prev, { type: "round_start", round: r }]);
        const result = await runOneRound(apiKey);

        // Auto-stop even in manual mode if OKRs complete
        if (result.okrsComplete) {
          setEvents((prev) => [...prev, { type: "okrs_complete" }]);
          break;
        }
      }
    }

    setProgress(100);
    setRunning(false);
    setCurrentAgent(null);
    onComplete();
  }

  function stopExecution() {
    stopRef.current = true;
  }

  function downloadExcel() {
    window.open("/api/export", "_blank");
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Centro de Control de Agentes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {running
              ? `Ronda ${currentRound}${okrProgress > 0 ? ` (OKRs: ${okrProgress}%)` : ""} - ${currentAgent || "iniciando..."}`
              : okrsComplete
                ? `Objetivos completados - ${finalStats?.leads || 0} leads, ${finalStats?.logs || 0} registros`
                : finalStats
                  ? `Completado - ${finalStats.leads} leads, ${finalStats.logs} registros`
                  : "Lanza los agentes para generar leads y avanzar en los objetivos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadExcel}
            className="px-3 py-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
          >
            Descargar Excel
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {showConfig ? "Ocultar" : "Opciones"}
          </button>
          {running ? (
            <button
              onClick={stopExecution}
              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Detener
            </button>
          ) : (
            <button
              onClick={startExecution}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 text-sm font-medium flex items-center gap-2"
            >
              Ejecutar agentes
            </button>
          )}
        </div>
      </div>

      {/* Config panel */}
      {showConfig && !running && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
          <div className="flex gap-4 items-end">
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
            {!autoMode && (
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-600 mb-1">Rondas</label>
                <select
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value={1}>1 ronda</option>
                  <option value={3}>3 rondas</option>
                  <option value={5}>5 rondas</option>
                  <option value={10}>10 rondas</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoMode}
                onChange={(e) => setAutoMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Modo continuo</span>
            </label>
            <span className="text-xs text-gray-400">
              {autoMode
                ? "Los agentes trabajaran hasta completar todos los OKRs o hasta que los detengas"
                : `${rounds} ronda${rounds > 1 ? "s" : ""} - cada una ejecuta los 5 agentes`}
            </span>
          </div>
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
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex justify-center gap-6 text-xs text-gray-600">
                    <span>{event.stats?.leads} leads</span>
                    <span>{event.stats?.logs} registros</span>
                  </div>
                </div>
              )}

              {event.type === "round_end" && event.okrProgress !== undefined && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span className="text-indigo-600 font-medium">Progreso OKRs: {event.okrProgress}%</span>
                    <div className="w-32 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${event.okrProgress}%` }}
                      ></div>
                    </div>
                    {event.okrsComplete && (
                      <span className="text-green-600 font-medium">Completados</span>
                    )}
                  </div>
                </div>
              )}

              {event.type === "okrs_complete" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-semibold text-green-700">
                    Todos los objetivos (OKRs) han sido completados
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Los agentes han alcanzado todas las metas. Descarga el Excel con los resultados.
                  </p>
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
