import type { TipoQuestao } from "@/lib/prova-parser";

export type OpcaoParaCorrigir = {
  id: string;
  correta: boolean;
};

export type QuestaoParaCorrigir = {
  id: string;
  tipo: TipoQuestao;
  peso: number;
  opcoes: OpcaoParaCorrigir[];
};

export type RespostaParaCorrigir = {
  questionId: string;
  optionId: string | null;
};

export type RespostaCorrigida = {
  questionId: string;
  correta: boolean | null;
};

export type ResultadoCorrecao = {
  respostas: RespostaCorrigida[];
  notaObjetiva: number;
  temDiscursivaPendente: boolean;
};

/**
 * Corrige objetivas e verdadeiro/falso comparando a opção escolhida com a
 * marcada como correta; discursivas ficam com correta = null (pendente de
 * correção humana — a fila ainda não existe, é a Fase 7). A nota objetiva é
 * ponderada pelo peso das questões corrigíveis automaticamente; discursivas
 * não entram nessa conta.
 */
export function corrigirTentativa(
  questoes: QuestaoParaCorrigir[],
  respostas: RespostaParaCorrigir[],
): ResultadoCorrecao {
  const respostaPorQuestao = new Map(respostas.map((r) => [r.questionId, r]));
  const resultado: RespostaCorrigida[] = [];

  let pesoTotal = 0;
  let pesoObtido = 0;
  let temDiscursivaPendente = false;

  for (const questao of questoes) {
    if (questao.tipo === "discursiva") {
      temDiscursivaPendente = true;
      resultado.push({ questionId: questao.id, correta: null });
      continue;
    }

    const resposta = respostaPorQuestao.get(questao.id);
    const opcaoCorreta = questao.opcoes.find((o) => o.correta);
    const acertou = Boolean(
      resposta?.optionId && opcaoCorreta && resposta.optionId === opcaoCorreta.id,
    );

    pesoTotal += questao.peso;
    if (acertou) pesoObtido += questao.peso;

    resultado.push({ questionId: questao.id, correta: acertou });
  }

  const notaObjetiva = pesoTotal > 0 ? (pesoObtido / pesoTotal) * 100 : 0;

  return {
    respostas: resultado,
    notaObjetiva,
    temDiscursivaPendente,
  };
}
