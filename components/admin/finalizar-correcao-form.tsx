"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FinalizarCorrecaoForm({
  attemptId,
  notaSugerida,
  notaMinima,
}: {
  attemptId: string;
  notaSugerida: number;
  notaMinima: number;
}) {
  const router = useRouter();
  const [nota, setNota] = useState(notaSugerida.toFixed(0));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/tentativas/${attemptId}/corrigir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota_final: Number(nota) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível salvar a correção.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Não foi possível salvar a correção.");
    } finally {
      setEnviando(false);
    }
  }

  const notaNumero = Number(nota);
  const aprovaria = Number.isFinite(notaNumero) && notaNumero >= notaMinima;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-xl border border-[var(--color-royal)] bg-[var(--color-royal-soft)] p-4"
    >
      <h2 className="text-base font-semibold text-[var(--color-ink)]">
        Analisar e finalizar
      </h2>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
        A correção automática das objetivas acima é só sugestão — confira as
        respostas e ajuste a nota se alguma resposta tiver fundamento no
        material. A nota só aparece pro aluno depois de você finalizar aqui.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-[var(--color-ink)]">
            Nota final (0–100)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            required
            className="w-28 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm focus:border-[var(--color-royal)] focus:outline-none"
          />
        </label>

        <span
          className={`rounded-full px-3 py-2 text-xs font-medium ${
            aprovaria ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {aprovaria ? "Aprovado" : "Reprovado"} (mínimo {notaMinima}%)
        </span>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-[var(--color-royal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
        >
          {enviando ? "Salvando..." : "Finalizar correção"}
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </form>
  );
}
