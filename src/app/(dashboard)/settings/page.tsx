"use client";

import { useState, useEffect } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<any[]>([]);
  const [instruction, setInstruction] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key");
    if (stored) setApiKey(stored);
    fetch("/api/agents")
      .then((r) => r.json())
      .then(setAgents);
  }, []);

  function saveKey() {
    localStorage.setItem("anthropic_api_key", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function resetData() {
    if (!confirm("Esto eliminará TODOS los leads, logs y datos actuales. Los agentes y OKRs se reinicializarán a cero. ¿Continuar?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetDone(true);
        setTimeout(() => setResetDone(false), 5000);
      }
    } finally {
      setResetting(false);
    }
  }

  async function runAgents() {
    const key = localStorage.getItem("anthropic_api_key");
    if (!key) {
      alert("Primero guarda tu API key de Anthropic");
      return;
    }

    setExecuting(true);
    setExecutionLog([]);

    try {
      const body: any = { apiKey: key, instruction: instruction || undefined };
      if (selectedAgent) body.agentId = selectedAgent;

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) {
        setExecutionLog([{ error: data.error }]);
      } else {
        setExecutionLog(data.results || []);
      }
    } catch (err) {
      setExecutionLog([{ error: String(err) }]);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="animate-fadeIn max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-gray-500 mt-1">API key, ejecucion de agentes y gestion de datos</p>
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">API Key de Anthropic (Claude)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Necesaria para que los agentes funcionen con IA real. Obtener en{" "}
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                console.anthropic.com
              </a>
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
              <button
                onClick={saveKey}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Guardar
              </button>
            </div>
            {saved && <p className="text-green-600 text-sm mt-2">API key guardada correctamente</p>}
            <p className="text-xs text-gray-400 mt-2">
              La key se guarda solo en tu navegador (localStorage), nunca se envia a nuestro servidor.
            </p>
          </CardContent>
        </Card>

        {/* Execute Agents */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Ejecutar Agentes</h2>
            <p className="text-sm text-gray-500 mt-1">
              Lanza un ciclo de trabajo. Cada agente analizara el pipeline y tomara acciones.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agente</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Todos los agentes (secuencial)</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.avatar} {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instruccion del Director Comercial (opcional)
                </label>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Ej: Enfocarse en distribuidores de la zona de Levante, buscar constructoras que esten haciendo obra nueva..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                onClick={runAgents}
                disabled={executing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {executing ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Ejecutando agentes... (esto puede tardar 1-2 minutos)
                  </>
                ) : (
                  "Ejecutar ciclo de trabajo"
                )}
              </button>
            </div>

            {/* Execution Results */}
            {executionLog.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Resultados de la ejecucion</h3>
                {executionLog.map((result, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {result.error ? (
                      <div className="text-red-600 text-sm">
                        <p className="font-semibold">Error</p>
                        <p>{result.error}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{agents.find((a) => a.id === result.agent?.id)?.avatar}</span>
                          <span className="font-semibold text-gray-900">{result.agent?.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            {result.actions?.filter((a: any) => a.success).length}/{result.actions?.length} acciones
                          </span>
                        </div>
                        {result.thinking && (
                          <details className="text-sm">
                            <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Ver razonamiento</summary>
                            <p className="mt-1 text-gray-600 bg-white p-3 rounded border">{result.thinking}</p>
                          </details>
                        )}
                        <p className="text-sm text-gray-700">{result.summary}</p>
                        <div className="flex flex-wrap gap-1">
                          {result.actions?.map((a: any, j: number) => (
                            <span
                              key={j}
                              className={`text-xs px-2 py-0.5 rounded-full ${a.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {a.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Data */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-red-600">Zona de peligro</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Resetear todos los datos</p>
                <p className="text-sm text-gray-500">
                  Elimina todos los leads, logs, llamadas y progreso. Reinicia los agentes y OKRs a cero.
                </p>
              </div>
              <button
                onClick={resetData}
                disabled={resetting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
              >
                {resetting ? "Reseteando..." : "Resetear datos"}
              </button>
            </div>
            {resetDone && (
              <p className="text-green-600 text-sm mt-3">
                Sistema reseteado correctamente. Agentes listos para operar con datos reales.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
