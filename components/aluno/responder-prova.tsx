"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OpcaoParaResponder = { id: string; texto: string };
type QuestaoParaResponder = {
  id: string;
  ordem: number;
  tipo: "objetiva" | "verdadeiro_falso" | "discursiva";
  enunciado: string;
  opcoes: OpcaoParaResponder[];
  respostaAtual: { optionId: string | null; textoResposta: string | null };
};

type RespostaLocal = { optionId: string | null; textoResposta: string | null };

export function ResponderProva({
  attemptId,
  cursoId,
  tituloProva,
  tentativasMax,
  questoes,
}: {
  attemptId: string;
  cursoId: string;
  tituloProva: string;
  tentativasMax: number;
  questoes: QuestaoParaResponder[];
}) {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>(
    Object.fromEntries(questoes.map((q) => [q.id, q.respostaAtual])),
  );
  const [indice, setIndice] = useState(0);
  const [conferencia, setConferencia] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const questao = questoes[indice];
  const respondidas = questoes.filter((q) => temResposta(respostas[q.id])).length;
  const semResposta = questoes.filter((q) => !temResposta(respostas[q.id]));

  function temResposta(r: RespostaLocal | undefined) {
    if (!r) return false;
    return Boolean(r.optionId) || Boolean(r.textoResposta?.trim());
  }

  async function salvarResposta(questionId: string, resposta: RespostaLocal) {
    setRespostas((atual) => ({ ...atual, [questionId]: resposta }));
    setSalvandoId(questionId);
    setSalvoId(null);
    try {
      await fetch(`/api/tentativas/${attemptId}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          option_id: resposta.optionId,
          texto_resposta: resposta.textoResposta,
        }),
      });
      setSalvoId(questionId);
    } finally {
      setSalvandoId(null);
    }
  }

  async function enviarProva() {
    const confirmado = window.confirm(
      `Você tem ${tentativasMax} tentativa${tentativasMax === 1 ? "" : "s"}. Enviar agora?`,
    );
    if (!confirmado) return;

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/tentativas/${attemptId}/enviar`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível enviar a prova.");
        return;
      }
      router.push(`/provas/${cursoId}/resultado`);
    } catch {
      setErro("Não foi possível enviar a prova.");
    } finally {
      setEnviando(false);
    }
  }

  if (conferencia) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-900">Conferência</h1>
        <p className="mt-1 text-sm text-gray-500">
          {respondidas} de {questoes.length} questões respondidas.
        </p>

        {semResposta.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Questões sem resposta:
            </p>
            <ul className="mt-2 space-y-1">
              {semResposta.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIndice(questoes.indexOf(q));
                      setConferencia(false);
                    }}
                    className="text-sm text-amber-800 underline"
                  >
                    Questão {q.ordem + 1}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setConferencia(false)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
          >
            Voltar às questões
          </button>
          <button
            type="button"
            onClick={enviarProva}
            disabled={enviando}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar prova"}
          </button>
        </div>
      </div>
    );
  }

  const resposta = respostas[questao.id];

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-900">{tituloProva}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Questão {indice + 1} de {questoes.length}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900"
          style={{ width: `${((indice + 1) / questoes.length) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {questoes.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndice(i)}
            className={`h-8 w-8 shrink-0 rounded-full text-xs font-medium ${
              i === indice
                ? "bg-gray-900 text-white"
                : temResposta(respostas[q.id])
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <p className="whitespace-pre-line text-base text-gray-900">
          {questao.enunciado}
        </p>

        {questao.tipo === "discursiva" ? (
          <textarea
            value={resposta?.textoResposta ?? ""}
            onChange={(e) =>
              setRespostas((atual) => ({
                ...atual,
                [questao.id]: { optionId: null, textoResposta: e.target.value },
              }))
            }
            onBlur={() =>
              salvarResposta(questao.id, {
                optionId: null,
                textoResposta: respostas[questao.id]?.textoResposta ?? "",
              })
            }
            rows={6}
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        ) : (
          <div className="mt-4 space-y-2">
            {questao.opcoes.map((opcao) => (
              <label
                key={opcao.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  resposta?.optionId === opcao.id
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name={`questao-${questao.id}`}
                  checked={resposta?.optionId === opcao.id}
                  onChange={() =>
                    salvarResposta(questao.id, { optionId: opcao.id, textoResposta: null })
                  }
                />
                <span className="text-sm text-gray-900">{opcao.texto}</span>
              </label>
            ))}
          </div>
        )}

        <p className="mt-3 h-4 text-xs text-gray-400">
          {salvandoId === questao.id
            ? "Salvando..."
            : salvoId === questao.id
              ? "Salvo"
              : ""}
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          Anterior
        </button>
        {indice < questoes.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndice((i) => Math.min(questoes.length - 1, i + 1))}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white"
          >
            Próxima
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConferencia(true)}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white"
          >
            Revisar e enviar
          </button>
        )}
      </div>
    </div>
  );
}
