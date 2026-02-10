"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";

interface LeadRow {
  id: string;
  companyName: string;
  companyType: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  description: string | null;
  website: string | null;
  phones: string | null;
  emails: string | null;
  keyContacts: string | null;
  status: string;
  confidence: string;
  batch: number;
}

interface AgentEvent {
  type: string;
  agent?: { id: string; name: string; avatar: string; role?: string };
  phase?: string;
  label?: string;
  companiesFound?: number;
  companiesEnriched?: number;
  error?: string;
  totalBatch?: number;
  totalAll?: number;
  noMoreResults?: boolean;
}

type AppPhase = "loading" | "setup" | "searching" | "results";
type SortKey = "companyName" | "companyType" | "batch" | "confidence";
type SortDir = "asc" | "desc";

const TYPE_LABELS: Record<string, string> = {
  pequeño_distribuidor: "Peq. Distribuidor",
  gran_mayorista: "Gran Mayorista",
  gran_constructora: "Gran Constructora",
  otro: "Otro",
};

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "pequeño_distribuidor", label: "Peq. Distribuidor" },
  { value: "gran_mayorista", label: "Gran Mayorista" },
  { value: "gran_constructora", label: "Gran Constructora" },
  { value: "otro", label: "Otro" },
];

function parseJSON(str: string | null): any[] {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

export default function DashboardPage() {
  const [phase, setPhase] = useState<AppPhase>("loading");
  const [hasEnvKey, setHasEnvKey] = useState(false);
  const [manualKey, setManualKey] = useState("");

  const [country, setCountry] = useState("España");
  const [city, setCity] = useState("");

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState("");
  const [currentBatch, setCurrentBatch] = useState(1);
  const [searching, setSearching] = useState(false);
  const [noMoreResults, setNoMoreResults] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Filters & sort
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("batch");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Non-destructive init: only create agents if missing, check env key
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/init", { method: "POST" });
        const data = await res.json();
        if (data.hasApiKey) setHasEnvKey(true);

        // Load existing leads if any
        const leadsRes = await fetch("/api/leads");
        const leadsData = await leadsRes.json();
        if (leadsData.length > 0) {
          setLeads(leadsData);
          const maxBatch = Math.max(...leadsData.map((l: LeadRow) => l.batch));
          setCurrentBatch(maxBatch);
          setPhase("results");
          return;
        }
      } catch (e) {
        console.error("Init error:", e);
      }
      setPhase("setup");
    }
    init();
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data);
    } catch (e) {
      console.error("Error loading leads:", e);
    }
  }, []);

  // Filtered + sorted leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.companyName.toLowerCase().includes(q) ||
          (l.address || "").toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q)
      );
    }

    if (filterType) {
      result = result.filter((l) => l.companyType === filterType);
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, searchText, filterType, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  async function runBatch(batch: number) {
    if (!hasEnvKey && !manualKey) {
      alert("Necesitas una API key de Anthropic.");
      return;
    }

    if (manualKey && !hasEnvKey) {
      localStorage.setItem("anthropic_api_key", manualKey);
    }

    const location = city ? `${city}, ${country}` : country;
    setSearching(true);
    setEvents([]);
    setCurrentPhaseLabel("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body: any = { location, batch };
      if (!hasEnvKey) body.apiKey = manualKey;

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
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
            setEvents((prev) => [...prev.slice(-40), event]);
            if (event.type === "phase" && event.label) {
              setCurrentPhaseLabel(event.label);
            }
            if (event.type === "complete") {
              if (event.noMoreResults) setNoMoreResults(true);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setEvents((prev) => [...prev, { type: "info", error: "Búsqueda cancelada por el usuario." }]);
      } else {
        setEvents((prev) => [...prev, { type: "error", error: String(err) }]);
      }
    }

    abortRef.current = null;
    await loadLeads();
    setSearching(false);
    setPhase("results");
  }

  function cancelSearch() {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }

  function startSearch() {
    setCurrentBatch(1);
    setLeads([]);
    setNoMoreResults(false);
    setPhase("searching");
    runBatch(1);
  }

  function searchMore() {
    const next = currentBatch + 1;
    setCurrentBatch(next);
    setPhase("searching");
    runBatch(next);
  }

  function downloadExcel() {
    window.open("/api/export", "_blank");
  }

  function startOver() {
    if (!confirm("¿Estás seguro? Esto eliminará todos los leads actuales y empezará de cero.")) return;
    setPhase("loading");
    setLeads([]);
    setEvents([]);
    setNoMoreResults(false);
    setCurrentBatch(1);
    setSearchText("");
    setFilterType("");
    fetch("/api/reset", { method: "POST" }).then(() => setPhase("setup"));
  }

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-500 text-lg">Inicializando...</p>
        </div>
      </div>
    );
  }

  // ── SETUP ──
  if (phase === "setup") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">AgenteComercial</h1>
            <p className="text-gray-500 text-lg">Buscador de leads para placas de yeso</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pais</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad o region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Madrid, Barcelona, Valencia..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {!hasEnvKey && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">API Key Anthropic</label>
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {hasEnvKey && (
              <div className="text-sm text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                API key configurada en el servidor
              </div>
            )}

            <button
              onClick={startSearch}
              disabled={!hasEnvKey && !manualKey}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-lg font-semibold shadow-lg"
            >
              Buscar 50 empresas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SEARCHING (progress) ──
  if (phase === "searching" && searching) {
    return (
      <div className="animate-fadeIn max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buscando empresas...</h1>
            <p className="text-gray-500 mt-1">
              {city ? `${city}, ${country}` : country} &middot; Lote #{currentBatch}
            </p>
            {currentPhaseLabel && (
              <p className="text-blue-600 font-medium mt-1 text-sm">{currentPhaseLabel}</p>
            )}
          </div>
          <button
            onClick={cancelSearch}
            className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>

        {/* Phase progress bar */}
        <div className="flex gap-2 mb-4">
          {["Fase 1/3: Buscando empresas", "Fase 2/3: Buscando teléfonos y emails", "Fase 3/3: Buscando contactos LinkedIn"].map((label, i) => {
            const isActive = currentPhaseLabel === label;
            const phaseNum = i + 1;
            const currentNum = currentPhaseLabel.match(/(\d)\/3/)?.[1];
            const isDone = currentNum ? parseInt(currentNum) > phaseNum : false;
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-all ${
                  isDone ? "bg-green-500" : isActive ? "bg-blue-500 animate-pulse" : "bg-gray-200"
                }`}
              />
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2">
            {events.map((event, i) => (
              <div key={i} className="animate-fadeIn">
                {event.type === "phase" && (
                  <div className="py-2 text-sm font-semibold text-blue-700 border-b border-blue-100">
                    {event.label}
                  </div>
                )}
                {event.type === "agent_start" && (
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-xl animate-pulse">{event.agent?.avatar}</span>
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{event.agent?.name}</span>
                      {event.phase === "search" && " buscando empresas..."}
                      {event.phase === "enrich_phones" && " buscando telefonos y emails..."}
                      {event.phase === "enrich_linkedin" && " buscando contactos LinkedIn..."}
                    </span>
                  </div>
                )}
                {event.type === "agent_done" && (
                  <div className="flex items-center gap-3 py-2 text-green-700">
                    <span className="text-xl">{event.agent?.avatar}</span>
                    <span className="text-sm">
                      <span className="font-medium">{event.agent?.name}</span>
                      {event.companiesFound !== undefined && ` - ${event.companiesFound} empresas encontradas`}
                      {event.companiesEnriched !== undefined && ` - ${event.companiesEnriched} empresas enriquecidas`}
                    </span>
                  </div>
                )}
                {event.type === "agent_error" && (
                  <div className="flex items-center gap-3 py-2 text-red-600">
                    <span className="text-xl">{event.agent?.avatar}</span>
                    <span className="text-sm">{event.agent?.name} - Error: {event.error?.slice(0, 100)}</span>
                  </div>
                )}
                {event.type === "info" && (
                  <div className="py-2 text-sm text-amber-600">{event.error}</div>
                )}
                {event.type === "complete" && (
                  <div className="py-3 text-center text-sm font-medium text-blue-600">
                    Lote completado: {event.totalBatch} empresas en este lote, {event.totalAll} en total
                  </div>
                )}
              </div>
            ))}
            {events.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-500">Conectando con agentes...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS TABLE ──
  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filteredLeads.length === leads.length
              ? `${leads.length} empresas encontradas`
              : `${filteredLeads.length} de ${leads.length} empresas`}
          </h1>
          <p className="text-gray-500 text-sm">
            {city ? `${city}, ${country}` : country} &middot; {currentBatch} lote{currentBatch > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadExcel}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Descargar Excel
          </button>
          {!noMoreResults ? (
            <button
              onClick={searchMore}
              disabled={searching}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {searching ? "Buscando..." : "Buscar 50 mas"}
            </button>
          ) : (
            <span className="px-5 py-2.5 bg-gray-100 text-gray-500 rounded-lg text-sm">
              No hay mas resultados nuevos
            </span>
          )}
          <button
            onClick={startOver}
            className="px-5 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
          >
            Nueva busqueda
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar por nombre, dirección, descripción..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">#</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:text-blue-600"
                  onClick={() => toggleSort("companyName")}
                >
                  Empresa {sortIcon("companyName")}
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:text-blue-600"
                  onClick={() => toggleSort("companyType")}
                >
                  Tipo {sortIcon("companyType")}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Direccion</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Maps</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Descripcion</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Telefonos / Emails</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Contactos clave</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:text-blue-600"
                  onClick={() => toggleSort("confidence")}
                >
                  Fiabilidad {sortIcon("confidence")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, idx) => {
                const phones = parseJSON(lead.phones);
                const emails = parseJSON(lead.emails);
                const contacts = parseJSON(lead.keyContacts);
                const isExpanded = expandedRow === lead.id;

                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${isExpanded ? "bg-blue-50/30" : ""}`}
                    onClick={() => setExpandedRow(isExpanded ? null : lead.id)}
                  >
                    <td className="px-4 py-3 text-gray-400 align-top">{idx + 1}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{lead.companyName}</div>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        lead.companyType === "pequeño_distribuidor" ? "bg-blue-50 text-blue-700" :
                        lead.companyType === "gran_mayorista" ? "bg-purple-50 text-purple-700" :
                        lead.companyType === "gran_constructora" ? "bg-amber-50 text-amber-700" :
                        "bg-gray-50 text-gray-600"
                      }`}>
                        {TYPE_LABELS[lead.companyType || ""] || lead.companyType || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 align-top max-w-[200px]">
                      <div className={isExpanded ? "" : "truncate"}>{lead.address || "-"}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {lead.googleMapsUrl ? (
                        <a
                          href={lead.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver mapa
                        </a>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 align-top max-w-[200px]">
                      <div className={isExpanded ? "" : "truncate"}>{lead.description || "-"}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        {phones.map((p: string, i: number) => (
                          <div key={i} className="text-xs text-gray-700">{p}</div>
                        ))}
                        {emails.map((e: string, i: number) => (
                          <div key={i} className="text-xs text-blue-600">{e}</div>
                        ))}
                        {phones.length === 0 && emails.length === 0 && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {contacts.length > 0 ? (
                        <div className="space-y-2">
                          {contacts.slice(0, isExpanded ? 100 : 2).map((c: any, i: number) => (
                            <div key={i} className="text-xs">
                              <div className="font-medium text-gray-900">{c.name || "(cargo)"}</div>
                              <div className="text-gray-500">{c.position}</div>
                              {c.linkedin && (
                                <a
                                  href={c.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  LinkedIn
                                </a>
                              )}
                              {c.phone && <div className="text-gray-600">{c.phone}</div>}
                              {c.email && <div className="text-blue-600">{c.email}</div>}
                            </div>
                          ))}
                          {!isExpanded && contacts.length > 2 && (
                            <div className="text-xs text-gray-400">+{contacts.length - 2} mas...</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        lead.confidence === "high" ? "bg-green-50 text-green-700" :
                        lead.confidence === "medium" ? "bg-yellow-50 text-yellow-700" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {lead.confidence === "high" ? "Alta" : lead.confidence === "medium" ? "Media" : "Baja"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && leads.length > 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No se encontraron resultados con esos filtros.
                  </td>
                </tr>
              )}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No hay datos todavia. Inicia una busqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
