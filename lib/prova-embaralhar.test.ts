import { describe, expect, it } from "vitest";
import { embaralharIds, ordenarPorSalvo } from "./prova-embaralhar";

describe("embaralharIds", () => {
  it("preserva o conjunto de ids, só muda a ordem (ou não)", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const resultado = embaralharIds(ids);
    expect(resultado.sort()).toEqual([...ids].sort());
    expect(resultado).toHaveLength(ids.length);
  });

  it("não muta o array original", () => {
    const ids = ["a", "b", "c"];
    const copiaOriginal = [...ids];
    embaralharIds(ids);
    expect(ids).toEqual(copiaOriginal);
  });
});

describe("ordenarPorSalvo", () => {
  const itens = [
    { id: "a", texto: "A" },
    { id: "b", texto: "B" },
    { id: "c", texto: "C" },
  ];

  it("sem ordem salva, mantém a ordem original", () => {
    expect(ordenarPorSalvo(itens)).toEqual(itens);
  });

  it("aplica a ordem salva", () => {
    const resultado = ordenarPorSalvo(itens, ["c", "a", "b"]);
    expect(resultado.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("itens fora da ordem salva vão pro final", () => {
    const resultado = ordenarPorSalvo(itens, ["b"]);
    expect(resultado.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
});
