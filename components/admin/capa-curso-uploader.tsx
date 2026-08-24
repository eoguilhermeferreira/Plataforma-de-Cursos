"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAPA_ALTURA_RECOMENDADA,
  CAPA_LARGURA_RECOMENDADA,
} from "@/lib/capas";

export function CapaCursoUploader({
  cursoId,
  capaUrlInicial,
}: {
  cursoId: string;
  capaUrlInicial: string | null;
}) {
  const router = useRouter();
  const [capaUrl, setCapaUrl] = useState(capaUrlInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFile(file: File) {
    setEnviando(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("capa", file);
      const res = await fetch(`/api/admin/cursos/${cursoId}/capa`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível enviar a capa.");
        return;
      }
      setCapaUrl(data.url);
      router.refresh();
    } catch {
      setErro("Não foi possível enviar a capa.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
      <h2 className="text-base font-semibold text-[var(--color-ink)]">Capa do curso</h2>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
        Aparece na tela inicial do aluno. Tamanho recomendado:{" "}
        {CAPA_LARGURA_RECOMENDADA} × {CAPA_ALTURA_RECOMENDADA}px (retrato,
        proporção 2:3). Nessa proporção a imagem não fica cortada.
      </p>

      <div className="mt-3 flex items-start gap-4">
        <div className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-royal-soft)]">
          {capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capaUrl}
              alt="Capa do curso"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-ink-soft)]">
              Sem capa
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="inline-block cursor-pointer rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs font-medium text-[var(--color-ink)]">
            {enviando ? "Enviando..." : capaUrl ? "Trocar capa" : "Enviar capa"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={enviando}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleFile(file);
              }}
            />
          </label>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>
      </div>
    </section>
  );
}
