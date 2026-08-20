import type { TipoQuestao } from "@/lib/prova-parser";

export type OpcaoRevisao = {
  texto: string;
  correta: boolean;
};

export type QuestaoRevisao = {
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  opcoes: OpcaoRevisao[];
};

export type AvisoRevisao = {
  nivel: "erro" | "atencao";
  mensagem: string;
  questaoOrdem?: number;
};

const LIMIAR_VIES_POSICAO = 0.4;

/**
 * Avisos da tela de revisão (regra 10 do CLAUDE.md). "erro" bloqueia a
 * publicação; "atencao" só avisa. Função pura: não toca banco, só olha o
 * estado atual das questões que a tela de revisão já tem em memória.
 */
export function avaliarProva(questoes: QuestaoRevisao[]): AvisoRevisao[] {
  const avisos: AvisoRevisao[] = [];
  const numeroDaQuestao = (ordem: number) => ordem + 1;

  let temDiscursiva = false;
  const posicoesCorretas: number[] = [];

  for (const questao of questoes) {
    if (!questao.enunciado.trim()) {
      avisos.push({
        nivel: "erro",
        mensagem: `Questão ${numeroDaQuestao(questao.ordem)}: enunciado vazio.`,
        questaoOrdem: questao.ordem,
      });
    }

    if (questao.tipo === "discursiva") {
      temDiscursiva = true;
      continue;
    }

    if (questao.opcoes.length < 2) {
      avisos.push({
        nivel: "erro",
        mensagem: `Questão ${numeroDaQuestao(questao.ordem)}: precisa de pelo menos duas alternativas.`,
        questaoOrdem: questao.ordem,
      });
      continue;
    }

    const corretas = questao.opcoes.filter((o) => o.correta);

    if (questao.tipo === "objetiva") {
      if (corretas.length === 0) {
        avisos.push({
          nivel: "erro",
          mensagem: `Questão ${numeroDaQuestao(questao.ordem)}: nenhuma alternativa marcada como correta.`,
          questaoOrdem: questao.ordem,
        });
      } else if (corretas.length > 1) {
        avisos.push({
          nivel: "erro",
          mensagem: `Questão ${numeroDaQuestao(questao.ordem)}: mais de uma alternativa marcada como correta.`,
          questaoOrdem: questao.ordem,
        });
      } else {
        posicoesCorretas.push(questao.opcoes.indexOf(corretas[0]));
      }
    }

    if (questao.tipo === "verdadeiro_falso" && corretas.length !== 1) {
      avisos.push({
        nivel: "erro",
        mensagem: `Questão ${numeroDaQuestao(questao.ordem)}: marque Verdadeiro ou Falso como resposta correta.`,
        questaoOrdem: questao.ordem,
      });
    }
  }

  if (temDiscursiva) {
    avisos.push({
      nivel: "atencao",
      mensagem:
        "Há questão discursiva nesta prova. A fila de correção manual ainda não existe — ela vai ficar pendente até a Fase 7.",
    });
  }

  if (posicoesCorretas.length > 0) {
    const contagem = new Map<number, number>();
    for (const posicao of posicoesCorretas) {
      contagem.set(posicao, (contagem.get(posicao) ?? 0) + 1);
    }
    for (const [, quantidade] of contagem) {
      if (quantidade / posicoesCorretas.length > LIMIAR_VIES_POSICAO) {
        avisos.push({
          nivel: "atencao",
          mensagem:
            "Mais de 40% do gabarito das objetivas cai na mesma posição de alternativa — pode ser um viés perceptível pelo aluno.",
        });
        break;
      }
    }
  }

  return avisos;
}

export function temAvisoBloqueante(avisos: AvisoRevisao[]): boolean {
  return avisos.some((a) => a.nivel === "erro");
}
