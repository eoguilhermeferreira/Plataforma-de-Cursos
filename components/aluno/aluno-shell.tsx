"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SidebarRail } from "@/components/aluno/sidebar-rail";
import { BottomNav } from "@/components/bottom-nav";

export function AlunoShell({
  nome,
  email,
  children,
}: {
  nome: string | null;
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [expandido, setExpandido] = useState(false);

  // Recolhe automaticamente sempre que a pessoa navega — ajustado durante a
  // renderização em vez de um efeito, pra evitar o cascading render de
  // setState dentro de useEffect.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathnameAnterior !== pathname) {
    setPathnameAnterior(pathname);
    setExpandido(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper)] md:flex-row">
      {expandido ? (
        <Sidebar nome={nome} email={email} onFechar={() => setExpandido(false)} />
      ) : (
        <SidebarRail onAbrir={() => setExpandido(true)} />
      )}

      <main
        className={`flex-1 pb-20 md:pb-0 ${expandido ? "md:ml-64" : "md:ml-16"}`}
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
