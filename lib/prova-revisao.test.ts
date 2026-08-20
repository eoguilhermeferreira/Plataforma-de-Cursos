import { describe, expect, it } from "vitest";
import { avaliarProva, temAvisoBloqueante, type QuestaoRevisao } from "./prova-revisao";

function objetiva(overrides: Partial<QuestaoRevisao> = {}): QuestaoRevisao {
  return {
    ordem: 0,
    tipo: "objetiva",
    enunciado: "Enunciado válido",
    opcoes: [
      { texto: "A", correta: true },
      { texto: "B", correta: false },
      { texto: "C", correta: false },
      { texto: "D", correta: false },
    ],
    ...overrides,
  };
}

describe("avaliarProva", () => {
  it("não gera avisos para uma prova bem formada", () => {
    const letraCorreta = ["A", "B", "C"];
    const avisos = avaliarProva(
      letraCorreta.map((letra, ordem) =>
        objetiva({
          ordem,
          opcoes: ["A", "B", "C", "D"].map((texto) => ({
            texto,
            correta: texto === letra,
          })),
        }),
      ),
    );
    expect(avisos).toHaveLength(0);
  });

  it("bloqueia questão objetiva sem nenhuma alternativa correta", () => {
    const avisos = avaliarProva([
      objetiva({
        opcoes: [
          { texto: "A", correta: false },
          { texto: "B", correta: false },
        ],
      }),
    ]);
    expect(temAvisoBloqueante(avisos)).toBe(true);
    expect(avisos[0].mensagem).toContain("nenhuma alternativa marcada");
  });

  it("bloqueia questão objetiva com mais de uma correta", () => {
    const avisos = avaliarProva([
      objetiva({
        opcoes: [
          { texto: "A", correta: true },
          { texto: "B", correta: true },
        ],
      }),
    ]);
    expect(temAvisoBloqueante(avisos)).toBe(true);
    expect(avisos[0].mensagem).toContain("mais de uma alternativa");
  });

  it("bloqueia questão com menos de duas alternativas", () => {
    const avisos = avaliarProva([
      objetiva({ opcoes: [{ texto: "A", correta: true }] }),
    ]);
    expect(temAvisoBloqueante(avisos)).toBe(true);
    expect(avisos[0].mensagem).toContain("pelo menos duas alternativas");
  });

  it("bloqueia enunciado vazio", () => {
    const avisos = avaliarProva([objetiva({ enunciado: "   " })]);
    expect(temAvisoBloqueante(avisos)).toBe(true);
    expect(avisos[0].mensagem).toContain("enunciado vazio");
  });

  it("avisa (sem bloquear) quando há questão discursiva", () => {
    const avisos = avaliarProva([
      objetiva(),
      { ordem: 1, tipo: "discursiva", enunciado: "Disserte sobre...", opcoes: [] },
    ]);
    expect(temAvisoBloqueante(avisos)).toBe(false);
    expect(avisos.some((a) => a.nivel === "atencao" && a.mensagem.includes("discursiva"))).toBe(
      true,
    );
  });

  it("avisa (sem bloquear) viés de posição quando >40% do gabarito cai na mesma letra", () => {
    const questoes: QuestaoRevisao[] = Array.from({ length: 10 }, (_, i) =>
      objetiva({
        ordem: i,
        opcoes: [
          { texto: "A", correta: i < 5 },
          { texto: "B", correta: i >= 5 && i < 7 },
          { texto: "C", correta: i >= 7 && i < 9 },
          { texto: "D", correta: i === 9 },
        ],
      }),
    );
    const avisos = avaliarProva(questoes);
    expect(temAvisoBloqueante(avisos)).toBe(false);
    expect(avisos.some((a) => a.mensagem.includes("viés"))).toBe(true);
  });

  it("verdadeiro_falso sem nenhuma opção marcada é bloqueante", () => {
    const avisos = avaliarProva([
      {
        ordem: 0,
        tipo: "verdadeiro_falso",
        enunciado: "Afirmação",
        opcoes: [
          { texto: "Verdadeiro", correta: false },
          { texto: "Falso", correta: false },
        ],
      },
    ]);
    expect(temAvisoBloqueante(avisos)).toBe(true);
  });
});
