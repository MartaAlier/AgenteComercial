import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgenteComercial - Gestión de Equipo de Ventas",
  description: "Plataforma de gestión de equipo de agentes de ventas para placas de yeso",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
