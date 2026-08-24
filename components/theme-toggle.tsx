"use client";

import { useEffect, useState } from "react";
import { IconLua, IconSol } from "@/components/icons";

const STORAGE_KEY = "tema";

export function ThemeToggle({ className }: { className?: string }) {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    // Lê o estado já aplicado pelo script inline no <head> (antes da
    // hidratação), só pra sincronizar o ícone do botão com ele.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEscuro(document.documentElement.dataset.theme === "dark");
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.dataset.theme = novo ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, novo ? "dark" : "light");
    } catch {
      // localStorage indisponível (modo privado, etc.) — a preferência só
      // não persiste entre sessões, o toggle continua funcionando.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo noturno"}
      title={escuro ? "Modo claro" : "Modo noturno"}
      className={className}
    >
      {escuro ? <IconSol className="h-4 w-4" /> : <IconLua className="h-4 w-4" />}
    </button>
  );
}
