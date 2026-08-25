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
  const isInicio = pathname === "/";
  const [aberto, setAberto] = useState(false);

  // Fecha o menu expandido automaticamente sempre que a pessoa navega — ele
  // é pra uma consulta rápida, não pra ficar aberto permanentemente fora da
  // tela de início. Ajustado durante a renderização em vez de um efeito,
  // pra evitar o cascading render de setState dentro de useEffect.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathnameAnterior !== pathname) {
    setPathnameAnterior(pathname);
    setAberto(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper)] md:flex-row">
      {isInicio ? (
        <Sidebar nome={nome} email={email} />
      ) : (
        <>
          <SidebarRail onAbrir={() => setAberto(true)} />
          {aberto && (
            <>
              <div
                className="fixed inset-0 z-20 hidden bg-black/40 md:block"
                onClick={() => setAberto(false)}
                aria-hidden
              />
              <Sidebar
                nome={nome}
                email={email}
                onFechar={() => setAberto(false)}
                className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[var(--color-royal-deep)] px-4 py-6 shadow-2xl md:flex"
              />
            </>
          )}
        </>
      )}

      <main
        className={`flex-1 pb-20 md:pb-0 ${
          isInicio ? "md:ml-64" : "md:ml-16"
        }`}
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
