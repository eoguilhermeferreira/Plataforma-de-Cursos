import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoQuestao } from "@/lib/prova-parser";

export type QuestaoParaSalvar = {
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  peso: number;
  embaralhar: boolean;
  opcoes: { texto: string; correta: boolean }[];
};

/**
 * Insere questões + alternativas em lote. Usado tanto na importação do
 * texto quanto no salvamento da revisão e na duplicação pra nova versão —
 * os três fluxos partem de uma lista completa de questões e escrevem tudo
 * de uma vez, sem diff linha a linha.
 */
export async function inserirQuestoesEOpcoes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  examId: string,
  questoes: QuestaoParaSalvar[],
): Promise<{ error: { message: string } | null }> {
  if (questoes.length === 0) return { error: null };

  const { data: criadas, error: qErr } = await supabase
    .from("exam_questions")
    .insert(
      questoes.map((q) => ({
        exam_id: examId,
        ordem: q.ordem,
        tipo: q.tipo,
        enunciado: q.enunciado,
        peso: q.peso,
        embaralhar: q.embaralhar,
      })),
    )
    .select("id, ordem");

  if (qErr || !criadas) {
    return { error: qErr ?? { message: "Não foi possível criar as questões." } };
  }

  const idPorOrdem = new Map(criadas.map((q) => [q.ordem, q.id]));

  const opcoesParaInserir = questoes.flatMap((q) => {
    const questionId = idPorOrdem.get(q.ordem);
    if (!questionId) return [];
    return q.opcoes.map((o, idx) => ({
      question_id: questionId,
      ordem: idx,
      texto: o.texto,
      correta: o.correta,
    }));
  });

  if (opcoesParaInserir.length > 0) {
    const { error: oErr } = await supabase.from("exam_options").insert(opcoesParaInserir);
    if (oErr) return { error: oErr };
  }

  return { error: null };
}
