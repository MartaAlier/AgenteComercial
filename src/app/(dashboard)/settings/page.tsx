"use client";

import { useState, useEffect } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasEnvKey, setHasEnvKey] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key");
    if (stored) setApiKey(stored);

    fetch("/api/init", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.hasApiKey) setHasEnvKey(true);
      })
      .catch(() => {});

    fetch("/api/leads")
      .then((r) => r.json())
      .then((leads) => setLeadCount(leads.length))
      .catch(() => {});
  }, []);

  function saveKey() {
    localStorage.setItem("anthropic_api_key", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function resetData() {
    if (!confirm("Esto eliminará TODOS los leads, logs y datos actuales. Los agentes se reinicializarán. ¿Continuar?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetDone(true);
        setLeadCount(0);
        setTimeout(() => setResetDone(false), 5000);
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="animate-fadeIn max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-gray-500 mt-1">API key y gestion de datos</p>
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
            {hasEnvKey ? (
              <div className="text-sm text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                API key configurada en el servidor (variable de entorno ANTHROPIC_API_KEY).
                No es necesario configurarla aqui.
              </div>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Estado del sistema</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{leadCount}</p>
                <p className="text-sm text-blue-600 mt-1">Leads encontrados</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-700">5</p>
                <p className="text-sm text-green-600 mt-1">Agentes activos</p>
              </div>
            </div>
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
                  Elimina todos los leads, logs y progreso. Reinicia los agentes.
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
                Sistema reseteado correctamente. Agentes listos para operar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
