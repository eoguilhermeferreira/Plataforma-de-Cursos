import { describe, expect, it } from "vitest";
import { corrigirTentativa, type QuestaoParaCorrigir } from "./prova-correcao";

function objetiva(id: string, peso = 1): QuestaoParaCorrigir {
  return {
    id,
    tipo: "objetiva",
    peso,
    opcoes: [
      { id: `${id}-A`, correta: true },
      { id: `${id}-B`, correta: false },
      { id: `${id}-C`, correta: false },
    ],
  };
}

describe("corrigirTentativa", () => {
  it("acerta 100% quando todas as respostas batem com a alternativa correta", () => {
    const questoes = [objetiva("q1"), objetiva("q2")];
    const resultado = corrigirTentativa(questoes, [
      { questionId: "q1", optionId: "q1-A" },
      { questionId: "q2", optionId: "q2-A" },
    ]);

    expect(resultado.notaObjetiva).toBe(100);
    expect(resultado.respostas.every((r) => r.correta === true)).toBe(true);
    expect(resultado.temDiscursivaPendente).toBe(false);
  });

  it("questão não respondida conta como errada", () => {
    const questoes = [objetiva("q1"), objetiva("q2")];
    const resultado = corrigirTentativa(questoes, [
      { questionId: "q1", optionId: "q1-A" },
      { questionId: "q2", optionId: null },
    ]);

    expect(resultado.notaObjetiva).toBe(50);
    const q2 = resultado.respostas.find((r) => r.questionId === "q2");
    expect(q2?.correta).toBe(false);
  });

  it("pondera a nota pelo peso de cada questão", () => {
    const questoes = [objetiva("q1", 3), objetiva("q2", 1)];
    const resultado = corrigirTentativa(questoes, [
      { questionId: "q1", optionId: "q1-A" },
      { questionId: "q2", optionId: "q2-B" },
    ]);

    expect(resultado.notaObjetiva).toBe(75);
  });

  it("verdadeiro_falso é corrigido como objetiva de duas alternativas", () => {
    const questao: QuestaoParaCorrigir = {
      id: "q1",
      tipo: "verdadeiro_falso",
      peso: 1,
      opcoes: [
        { id: "v", correta: false },
        { id: "f", correta: true },
      ],
    };
    const resultado = corrigirTentativa([questao], [{ questionId: "q1", optionId: "f" }]);
    expect(resultado.notaObjetiva).toBe(100);
    expect(resultado.respostas[0].correta).toBe(true);
  });

  it("discursiva fica com correta = null e não entra na nota objetiva", () => {
    const questoes: QuestaoParaCorrigir[] = [
      objetiva("q1"),
      { id: "q2", tipo: "discursiva", peso: 1, opcoes: [] },
    ];
    const resultado = corrigirTentativa(questoes, [
      { questionId: "q1", optionId: "q1-A" },
      { questionId: "q2", optionId: null },
    ]);

    expect(resultado.notaObjetiva).toBe(100);
    expect(resultado.temDiscursivaPendente).toBe(true);
    const q2 = resultado.respostas.find((r) => r.questionId === "q2");
    expect(q2?.correta).toBeNull();
  });

  it("prova só com discursivas não gera divisão por zero", () => {
    const questoes: QuestaoParaCorrigir[] = [
      { id: "q1", tipo: "discursiva", peso: 1, opcoes: [] },
    ];
    const resultado = corrigirTentativa(questoes, []);
    expect(resultado.notaObjetiva).toBe(0);
    expect(resultado.temDiscursivaPendente).toBe(true);
  });
});
