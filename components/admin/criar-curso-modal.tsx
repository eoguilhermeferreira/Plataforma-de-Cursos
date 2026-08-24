"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CriarCursoModal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setTitulo("");
    setDescricao("");
    setErro(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível criar o curso.");
        return;
      }
      fechar();
      router.push(`/admin/cursos/${data.id}`);
      router.refresh();
    } catch {
      setErro("Não foi possível criar o curso.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg bg-[var(--color-royal)] px-4 py-2 text-sm font-medium text-white"
      >
        Criar curso
      </button>

      {aberto && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-xl bg-white p-6 sm:rounded-xl">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Criar curso</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="titulo-curso"
                  className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                >
                  Título
                </label>
                <input
                  id="titulo-curso"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="descricao-curso"
                  className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                >
                  Descrição
                </label>
                <textarea
                  id="descricao-curso"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                />
              </div>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fechar}
                  className="flex-1 rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm font-medium text-[var(--color-ink)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 rounded-lg bg-[var(--color-royal)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
                >
                  {carregando ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
