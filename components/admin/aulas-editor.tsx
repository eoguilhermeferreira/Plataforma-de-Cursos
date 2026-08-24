"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Aula = {
  id: string;
  titulo: string;
  ordem: number;
  versao: number;
  tempo_minimo_segundos: number;
  publicado: boolean;
  atualizado_em: string;
};

export function AulasEditor({
  cursoId,
  aulasIniciais,
}: {
  cursoId: string;
  aulasIniciais: Aula[];
}) {
  const router = useRouter();
  const [aulas, setAulas] = useState(aulasIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  // Ajusta o estado local durante a renderização quando os dados do
  // servidor mudam (ex.: depois de um router.refresh()), em vez de um
  // efeito — evita o cascading render de setState dentro de useEffect.
  const [aulasIniciaisAnteriores, setAulasIniciaisAnteriores] = useState(aulasIniciais);
  if (aulasIniciaisAnteriores !== aulasIniciais) {
    setAulasIniciaisAnteriores(aulasIniciais);
    setAulas(aulasIniciais);
  }

  async function persistirOrdem(novaOrdem: Aula[]) {
    setAulas(novaOrdem);
    await fetch("/api/admin/aulas/ordem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aulas: novaOrdem.map((a) => ({ id: a.id })) }),
    });
    router.refresh();
  }

  function handleDrop(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;

    const nova = [...aulas];
    const [movida] = nova.splice(from, 1);
    nova.splice(index, 0, movida);
    persistirOrdem(nova);
  }

  async function atualizarAula(id: string, updates: Record<string, unknown>) {
    setErro(null);
    const res = await fetch(`/api/admin/aulas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErro(data?.error ?? "Não foi possível salvar a aula.");
      return;
    }
    router.refresh();
  }

  async function substituirPdf(id: string, file: File) {
    setErro(null);
    const form = new FormData();
    form.append("pdf", file);
    const res = await fetch(`/api/admin/aulas/${id}/pdf`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErro(data?.error ?? "Não foi possível substituir o PDF.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
      <h2 className="text-base font-semibold text-[var(--color-ink)]">Aulas</h2>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
        Arraste pelo ⠿ para reordenar.
      </p>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <ul className="mt-4 space-y-3">
        {aulas.map((aula, index) => (
          <li
            key={aula.id}
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className="rounded-lg border border-[var(--color-line)] bg-gray-50 p-3"
          >
            <div className="flex items-start gap-2">
              <span
                className="cursor-grab pt-2 text-gray-400 select-none"
                aria-hidden
              >
                ⠿
              </span>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  defaultValue={aula.titulo}
                  onBlur={(e) => {
                    const valor = e.target.value.trim();
                    if (valor && valor !== aula.titulo) {
                      atualizarAula(aula.id, { titulo: valor });
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] focus:border-[var(--color-royal)] focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-soft)]">
                  <label className="flex items-center gap-1">
                    Tempo mínimo (s)
                    <input
                      type="number"
                      min={0}
                      defaultValue={aula.tempo_minimo_segundos}
                      onBlur={(e) => {
                        const valor = Number(e.target.value);
                        if (
                          Number.isFinite(valor) &&
                          valor >= 0 &&
                          valor !== aula.tempo_minimo_segundos
                        ) {
                          atualizarAula(aula.id, {
                            tempo_minimo_segundos: valor,
                          });
                        }
                      }}
                      className="w-20 rounded border border-[var(--color-line)] px-2 py-1"
                    />
                  </label>
                  <span>versão {aula.versao}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      atualizarAula(aula.id, { publicado: !aula.publicado })
                    }
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      aula.publicado
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {aula.publicado ? "Publicada" : "Rascunho"}
                  </button>

                  <label className="cursor-pointer rounded-lg border border-[var(--color-line)] px-2 py-1 text-xs font-medium text-[var(--color-ink)]">
                    Substituir PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) substituirPdf(aula.id, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </li>
        ))}

        {aulas.length === 0 && (
          <li className="text-sm text-[var(--color-ink-soft)]">Nenhuma aula criada ainda.</li>
        )}
      </ul>

      <NovaAulaForm cursoId={cursoId} onCriada={() => router.refresh()} />
    </section>
  );
}

function NovaAulaForm({
  cursoId,
  onCriada,
}: {
  cursoId: string;
  onCriada: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tempoMinimo, setTempoMinimo] = useState(180);
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErro("Selecione o PDF da aula.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("tempo_minimo_segundos", String(tempoMinimo));
      form.append("pdf", file);

      const res = await fetch(`/api/admin/cursos/${cursoId}/aulas`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível criar a aula.");
        return;
      }
      setTitulo("");
      setTempoMinimo(180);
      setFile(null);
      onCriada();
    } catch {
      setErro("Não foi possível criar a aula.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-lg border border-dashed border-[var(--color-line)] p-3"
    >
      <p className="text-sm font-medium text-[var(--color-ink)]">Nova aula</p>

      <input
        type="text"
        placeholder="Título da aula"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        required
        className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:border-[var(--color-royal)] focus:outline-none"
      />

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-[var(--color-ink-soft)]">
          Tempo mínimo (s)
          <input
            type="number"
            min={0}
            value={tempoMinimo}
            onChange={(e) => setTempoMinimo(Number(e.target.value))}
            className="w-20 rounded border border-[var(--color-line)] px-2 py-1"
          />
        </label>
      </div>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-[var(--color-ink)]"
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-[var(--color-royal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
      >
        {enviando ? "Enviando..." : "Adicionar aula"}
      </button>
    </form>
  );
}
