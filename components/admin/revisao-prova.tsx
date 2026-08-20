"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { avaliarProva, temAvisoBloqueante } from "@/lib/prova-revisao";
import type { TipoQuestao } from "@/lib/prova-parser";
import type { ProvaCompleta } from "@/lib/admin-provas";

type OpcaoState = { texto: string; correta: boolean };
type QuestaoState = {
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  peso: number;
  embaralhar: boolean;
  opcoes: OpcaoState[];
};

const TIPO_LABEL: Record<TipoQuestao, string> = {
  objetiva: "Objetiva",
  verdadeiro_falso: "Verdadeiro/Falso",
  discursiva: "Discursiva",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  substituida: "Substituída",
};

function renumerar(questoes: QuestaoState[]): QuestaoState[] {
  return questoes.map((q, ordem) => ({ ...q, ordem }));
}

function novaQuestao(ordem: number): QuestaoState {
  return {
    ordem,
    tipo: "objetiva",
    enunciado: "",
    peso: 1,
    embaralhar: true,
    opcoes: [
      { texto: "", correta: false },
      { texto: "", correta: false },
    ],
  };
}

function opcoesParaTipo(tipo: TipoQuestao, atuais: OpcaoState[]): OpcaoState[] {
  if (tipo === "verdadeiro_falso") {
    return [
      { texto: "Verdadeiro", correta: false },
      { texto: "Falso", correta: false },
    ];
  }
  if (tipo === "discursiva") return [];
  if (atuais.length >= 2) return atuais;
  return [
    { texto: "", correta: false },
    { texto: "", correta: false },
  ];
}

export function RevisaoProva({
  cursoId,
  prova,
}: {
  cursoId: string;
  prova: ProvaCompleta;
}) {
  const router = useRouter();
  const editavel = prova.exam.status === "rascunho";

  const [titulo, setTitulo] = useState(prova.exam.titulo);
  const [notaMinima, setNotaMinima] = useState(prova.exam.nota_minima);
  const [tentativasMax, setTentativasMax] = useState(prova.exam.tentativas_max);
  const [mostrarGabarito, setMostrarGabarito] = useState(prova.exam.mostrar_gabarito);
  const [questoes, setQuestoes] = useState<QuestaoState[]>(
    prova.questoes.map((q) => ({
      ordem: q.ordem,
      tipo: q.tipo,
      enunciado: q.enunciado,
      peso: q.peso,
      embaralhar: q.embaralhar,
      opcoes: q.opcoes.map((o) => ({ texto: o.texto, correta: o.correta })),
    })),
  );

  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [criandoVersao, setCriandoVersao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const avisos = useMemo(() => avaliarProva(questoes), [questoes]);
  const bloqueado = temAvisoBloqueante(avisos);

  function atualizarQuestao(index: number, patch: Partial<QuestaoState>) {
    setQuestoes((atual) =>
      atual.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function mudarTipo(index: number, tipo: TipoQuestao) {
    setQuestoes((atual) =>
      atual.map((q, i) =>
        i === index ? { ...q, tipo, opcoes: opcoesParaTipo(tipo, q.opcoes) } : q,
      ),
    );
  }

  function marcarCorreta(index: number, opcaoIndex: number) {
    setQuestoes((atual) =>
      atual.map((q, i) =>
        i === index
          ? {
              ...q,
              opcoes: q.opcoes.map((o, oi) => ({ ...o, correta: oi === opcaoIndex })),
            }
          : q,
      ),
    );
  }

  function atualizarOpcaoTexto(index: number, opcaoIndex: number, texto: string) {
    setQuestoes((atual) =>
      atual.map((q, i) =>
        i === index
          ? {
              ...q,
              opcoes: q.opcoes.map((o, oi) => (oi === opcaoIndex ? { ...o, texto } : o)),
            }
          : q,
      ),
    );
  }

  function adicionarOpcao(index: number) {
    setQuestoes((atual) =>
      atual.map((q, i) =>
        i === index ? { ...q, opcoes: [...q.opcoes, { texto: "", correta: false }] } : q,
      ),
    );
  }

  function removerOpcao(index: number, opcaoIndex: number) {
    setQuestoes((atual) =>
      atual.map((q, i) =>
        i === index ? { ...q, opcoes: q.opcoes.filter((_, oi) => oi !== opcaoIndex) } : q,
      ),
    );
  }

  function removerQuestao(index: number) {
    setQuestoes((atual) => renumerar(atual.filter((_, i) => i !== index)));
  }

  function adicionarQuestao() {
    setQuestoes((atual) => [...atual, novaQuestao(atual.length)]);
  }

  async function salvarRascunho() {
    setSalvando(true);
    setErro(null);
    setOk(null);
    try {
      const res = await fetch(`/api/admin/provas/${prova.exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          nota_minima: notaMinima,
          tentativas_max: tentativasMax,
          mostrar_gabarito: mostrarGabarito,
          questoes,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível salvar o rascunho.");
        return;
      }
      setOk("Rascunho salvo.");
      router.refresh();
    } catch {
      setErro("Não foi possível salvar o rascunho.");
    } finally {
      setSalvando(false);
    }
  }

  async function publicar() {
    setPublicando(true);
    setErro(null);
    setOk(null);
    try {
      await salvarRascunho();

      const res = await fetch(`/api/admin/provas/${prova.exam.id}/publicar`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível publicar a prova.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Não foi possível publicar a prova.");
    } finally {
      setPublicando(false);
    }
  }

  async function criarNovaVersao() {
    setCriandoVersao(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/provas/${prova.exam.id}/nova-versao`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível criar a nova versão.");
        return;
      }
      router.push(`/admin/cursos/${cursoId}/prova/${data.id}`);
    } catch {
      setErro("Não foi possível criar a nova versão.");
    } finally {
      setCriandoVersao(false);
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {titulo} <span className="text-sm font-normal text-gray-400">v{prova.exam.versao}</span>
        </h1>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
          {STATUS_LABEL[prova.exam.status] ?? prova.exam.status}
        </span>
      </div>

      {(prova.exam.status === "publicada" || prova.exam.status === "substituida") && (
        <Link
          href={`/admin/provas/${prova.exam.id}/resultados`}
          className="block rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
        >
          Ver resultados
        </Link>
      )}

      {!editavel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Esta prova já foi publicada e é imutável (regra 11 do CLAUDE.md). Pra
          mudar qualquer coisa, crie uma nova versão — ela parte de uma cópia
          desta prova em rascunho.
          <button
            type="button"
            onClick={criarNovaVersao}
            disabled={criandoVersao || prova.exam.status !== "publicada"}
            className="mt-3 block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {criandoVersao ? "Criando..." : "Criar nova versão"}
          </button>
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">Configurações</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={!editavel}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nota mínima (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={notaMinima}
              onChange={(e) => setNotaMinima(Number(e.target.value))}
              disabled={!editavel}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tentativas máximas
            </label>
            <input
              type="number"
              min={1}
              value={tentativasMax}
              onChange={(e) => setTentativasMax(Number(e.target.value))}
              disabled={!editavel}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={mostrarGabarito}
                onChange={(e) => setMostrarGabarito(e.target.checked)}
                disabled={!editavel}
              />
              Mostrar gabarito ao aluno após a correção
            </label>
          </div>
        </div>
      </section>

      {avisos.length > 0 && (
        <section className="space-y-2">
          {avisos
            .filter((a) => a.nivel === "erro")
            .map((aviso, i) => (
              <p
                key={`erro-${i}`}
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {aviso.mensagem}
              </p>
            ))}
          {avisos
            .filter((a) => a.nivel === "atencao")
            .map((aviso, i) => (
              <p
                key={`atencao-${i}`}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
              >
                {aviso.mensagem}
              </p>
            ))}
        </section>
      )}

      <section className="space-y-4">
        {questoes.map((questao, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">
                Questão {index + 1}
              </span>
              {editavel && (
                <button
                  type="button"
                  onClick={() => removerQuestao(index)}
                  className="text-xs text-red-600 underline"
                >
                  Remover
                </button>
              )}
            </div>

            <textarea
              value={questao.enunciado}
              onChange={(e) => atualizarQuestao(index, { enunciado: e.target.value })}
              disabled={!editavel}
              rows={3}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                Tipo
                <select
                  value={questao.tipo}
                  onChange={(e) => mudarTipo(index, e.target.value as TipoQuestao)}
                  disabled={!editavel}
                  className="rounded border border-gray-300 px-2 py-1"
                >
                  {Object.entries(TIPO_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1 text-xs text-gray-600">
                Peso
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={questao.peso}
                  onChange={(e) =>
                    atualizarQuestao(index, { peso: Number(e.target.value) })
                  }
                  disabled={!editavel}
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
              </label>

              {questao.tipo === "objetiva" && (
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={questao.embaralhar}
                    onChange={(e) =>
                      atualizarQuestao(index, { embaralhar: e.target.checked })
                    }
                    disabled={!editavel}
                  />
                  Embaralhar alternativas
                </label>
              )}
            </div>

            {questao.tipo !== "discursiva" && (
              <div className="mt-3 space-y-2">
                {questao.opcoes.map((opcao, opcaoIndex) => (
                  <div key={opcaoIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correta-${index}`}
                      checked={opcao.correta}
                      onChange={() => marcarCorreta(index, opcaoIndex)}
                      disabled={!editavel}
                      aria-label={`Marcar alternativa como correta`}
                    />
                    <input
                      type="text"
                      value={opcao.texto}
                      onChange={(e) =>
                        atualizarOpcaoTexto(index, opcaoIndex, e.target.value)
                      }
                      disabled={!editavel || questao.tipo === "verdadeiro_falso"}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    {editavel &&
                      questao.tipo === "objetiva" &&
                      questao.opcoes.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removerOpcao(index, opcaoIndex)}
                          className="text-xs text-red-600 underline"
                        >
                          Remover
                        </button>
                      )}
                  </div>
                ))}

                {editavel && questao.tipo === "objetiva" && (
                  <button
                    type="button"
                    onClick={() => adicionarOpcao(index)}
                    className="text-xs font-medium text-gray-700 underline"
                  >
                    + Adicionar alternativa
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {editavel && (
          <button
            type="button"
            onClick={adicionarQuestao}
            className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
          >
            + Adicionar questão
          </button>
        )}
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {ok && <p className="text-sm text-green-700">{ok}</p>}

      {editavel && (
        <div className="sticky bottom-20 flex gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow sm:bottom-4">
          <button
            type="button"
            onClick={salvarRascunho}
            disabled={salvando || publicando}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar rascunho"}
          </button>
          <button
            type="button"
            onClick={publicar}
            disabled={bloqueado || salvando || publicando}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {publicando ? "Publicando..." : "Publicar"}
          </button>
        </div>
      )}
    </div>
  );
}
