"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Curso = {
  id: string;
  titulo: string;
  descricao: string | null;
  publicado: boolean;
};

export function EditarCursoForm({ curso }: { curso: Curso }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(curso.titulo);
  const [descricao, setDescricao] = useState(curso.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(updates: Record<string, unknown>) {
    setErro(null);
    const res = await fetch(`/api/admin/cursos/${curso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível salvar.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvar({ titulo, descricao });
    } finally {
      setSalvando(false);
    }
  }

  async function togglePublicado() {
    setPublicando(true);
    try {
      await salvar({ publicado: !curso.publicado });
    } finally {
      setPublicando(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Dados do curso</h2>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            curso.publicado
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {curso.publicado ? "Publicado" : "Rascunho"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="titulo-edicao"
            className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
          >
            Título
          </label>
          <input
            id="titulo-edicao"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="descricao-edicao"
            className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
          >
            Descrição
          </label>
          <textarea
            id="descricao-edicao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-lg bg-[var(--color-royal)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={togglePublicado}
            disabled={publicando}
            className="flex-1 rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50"
          >
            {publicando
              ? "Aguarde..."
              : curso.publicado
                ? "Despublicar"
                : "Publicar"}
          </button>
        </div>
      </form>
    </section>
  );
}
