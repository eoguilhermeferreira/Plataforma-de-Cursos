"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportarProvaForm({ cursoId }: { cursoId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/prova/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível importar a prova.");
        return;
      }
      router.push(`/admin/cursos/${cursoId}/prova/${data.id}`);
    } catch {
      setErro("Não foi possível importar a prova.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        required
        rows={18}
        placeholder={`1. Enunciado da questão...\nA) alternativa\nB) alternativa\n---\n...\n\nGABARITO\n1. B`}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-gray-900 focus:outline-none"
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={carregando || !texto.trim()}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
      >
        {carregando ? "Importando..." : "Importar e revisar"}
      </button>
    </form>
  );
}
