"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IniciarProvaButton({
  examId,
  cursoId,
}: {
  examId: string;
  cursoId: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciar() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/provas/${examId}/iniciar`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível iniciar a prova.");
        return;
      }
      router.push(`/provas/${cursoId}/responder`);
    } catch {
      setErro("Não foi possível iniciar a prova.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={iniciar}
        disabled={carregando}
        className="block w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
      >
        {carregando ? "Iniciando..." : "Iniciar prova"}
      </button>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
