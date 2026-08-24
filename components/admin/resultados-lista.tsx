"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LiberarTentativaModal } from "@/components/admin/liberar-tentativa-modal";

type ResultadoLinha = {
  attemptId: string;
  userId: string;
  nome: string | null;
  email: string;
  enviadoEm: string;
  status: "aguardando_correcao" | "corrigida";
  notaFinal: number | null;
  aprovado: boolean | null;
};

type Filtro = "todos" | "aprovado" | "reprovado";

export function ResultadosLista({
  examId,
  linhas,
}: {
  examId: string;
  linhas: ResultadoLinha[];
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [liberarPara, setLiberarPara] = useState<ResultadoLinha | null>(null);

  const filtradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro === "aprovado" && l.aprovado !== true) return false;
      if (filtro === "reprovado" && l.aprovado !== false) return false;
      if (!buscaNormalizada) return true;
      return (
        (l.nome ?? "").toLowerCase().includes(buscaNormalizada) ||
        l.email.toLowerCase().includes(buscaNormalizada)
      );
    });
  }, [linhas, busca, filtro]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Buscar por nome ou email"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm focus:border-[var(--color-royal)] focus:outline-none"
        />
        <div className="flex gap-2">
          {(["todos", "aprovado", "reprovado"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setFiltro(opcao)}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                filtro === opcao
                  ? "bg-[var(--color-royal)] text-white"
                  : "border border-[var(--color-line)] text-[var(--color-ink)]"
              }`}
            >
              {opcao === "todos" ? "Todos" : opcao === "aprovado" ? "Aprovados" : "Reprovados"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]">
        <ul className="divide-y divide-[var(--color-line)]">
          {filtradas.map((linha) => (
            <li
              key={linha.attemptId}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {linha.nome || linha.email}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">{linha.email}</p>
                <p className="text-xs text-gray-400">
                  {new Date(linha.enviadoEm).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {linha.status === "aguardando_correcao" ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                    Em correção
                  </span>
                ) : (
                  <>
                    <span className="text-sm text-[var(--color-ink-soft)]">
                      {linha.notaFinal?.toFixed(0)}%
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        linha.aprovado
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {linha.aprovado ? "Aprovado" : "Reprovado"}
                    </span>
                  </>
                )}

                <Link
                  href={`/admin/provas/${examId}/resultados/${linha.attemptId}`}
                  className="text-xs font-medium text-[var(--color-ink)] underline"
                >
                  Ver
                </Link>

                {linha.aprovado === false && (
                  <button
                    type="button"
                    onClick={() => setLiberarPara(linha)}
                    className="text-xs font-medium text-[var(--color-ink)] underline"
                  >
                    Liberar nova tentativa
                  </button>
                )}
              </div>
            </li>
          ))}

          {filtradas.length === 0 && (
            <li className="p-4 text-sm text-[var(--color-ink-soft)]">Nenhuma tentativa encontrada.</li>
          )}
        </ul>
      </div>

      {liberarPara && (
        <LiberarTentativaModal
          examId={examId}
          userId={liberarPara.userId}
          nomeAluno={liberarPara.nome || liberarPara.email}
          onFechar={() => setLiberarPara(null)}
        />
      )}
    </div>
  );
}
