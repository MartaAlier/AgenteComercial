"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/agents", label: "Agentes", icon: "🤖" },
  { href: "/leads", label: "Leads", icon: "🎯" },
  { href: "/okrs", label: "OKRs & KPIs", icon: "📈" },
  { href: "/logs", label: "Registro de Actividad", icon: "📋" },
  { href: "/settings", label: "Configuracion", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-800 text-white flex flex-col z-50">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">AgenteComercial</h1>
        <p className="text-slate-400 text-xs mt-1">Equipo de Ventas - Placas de Yeso</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-lg">
            👔
          </div>
          <div>
            <p className="text-sm font-medium">Director Comercial</p>
            <p className="text-xs text-slate-400">Panel de control</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
