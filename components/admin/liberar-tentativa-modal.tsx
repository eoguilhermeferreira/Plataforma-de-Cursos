"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LiberarTentativaModal({
  examId,
  userId,
  nomeAluno,
  onFechar,
}: {
  examId: string;
  userId: string;
  nomeAluno: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      setErro("Motivo é obrigatório.");
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/provas/${examId}/liberar-tentativa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, motivo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível liberar a nova tentativa.");
        return;
      }
      onFechar();
      router.refresh();
    } catch {
      setErro("Não foi possível liberar a nova tentativa.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-xl bg-white p-6 sm:rounded-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          Liberar nova tentativa
        </h2>
        <p className="mt-1 text-sm text-gray-500">Para {nomeAluno}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="motivo-liberacao"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Motivo
            </label>
            <textarea
              id="motivo-liberacao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {carregando ? "Liberando..." : "Liberar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
