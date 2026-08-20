/** Fisher-Yates. Pura, sem estado — o chamador decide o que fazer com o resultado. */
export function embaralharIds(ids: string[]): string[] {
  const copia = [...ids];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Reordena uma lista de itens (com id) segundo uma ordem salva de ids. Itens
 * que não estão na ordem salva (não deveria acontecer, mas por segurança)
 * vão pro final, na ordem original.
 */
export function ordenarPorSalvo<T extends { id: string }>(
  itens: T[],
  ordemSalva?: string[],
): T[] {
  if (!ordemSalva || ordemSalva.length === 0) return itens;

  const porId = new Map(itens.map((item) => [item.id, item]));
  const ordenados = ordemSalva
    .map((id) => porId.get(id))
    .filter((item): item is T => Boolean(item));

  const idsUsados = new Set(ordenados.map((item) => item.id));
  const restantes = itens.filter((item) => !idsUsados.has(item.id));

  return [...ordenados, ...restantes];
}
