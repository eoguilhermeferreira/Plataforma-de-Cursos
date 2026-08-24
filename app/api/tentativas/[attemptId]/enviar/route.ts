import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { corrigirTentativa, type QuestaoParaCorrigir } from "@/lib/prova-correcao";

/**
 * Envia a tentativa: corrige objetivas/V-F automaticamente (referência pro
 * avaliador) e consome a tentativa, mas nunca finaliza nota/aprovação
 * sozinha — toda tentativa enviada vai para análise humana antes do aluno
 * ver o resultado (decisão de negócio: gabarito automático pode estar
 * errado ou a resposta do aluno pode ter fundamento no material). Quem
 * finaliza é o admin, em /admin/correcoes. Idempotente — clicar duas vezes
 * não cria nem corrige duas vezes, só devolve o estado já enviado na
 * segunda chamada.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, status")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ error: "Tentativa não encontrada." }, { status: 404 });
  }

  if (attempt.status !== "em_andamento") {
    return NextResponse.json({ ok: true, jaEnviada: true });
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("id")
    .eq("id", attempt.exam_id)
    .maybeSingle();

  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }

  const { data: questoesRaw } = await supabase
    .from("exam_questions")
    .select("id, tipo, peso")
    .eq("exam_id", attempt.exam_id);

  const questionIds = (questoesRaw ?? []).map((q) => q.id);

  // Grava a correção com service_role: precisa ler exam_options.correta,
  // que o aluno nunca enxerga por RLS.
  const admin = createServiceRoleClient();
  const { data: opcoes } =
    questionIds.length > 0
      ? await admin
          .from("exam_options")
          .select("id, question_id, correta")
          .in("question_id", questionIds)
      : { data: [] };

  const opcoesPorQuestao = new Map<string, { id: string; correta: boolean }[]>();
  for (const opcao of opcoes ?? []) {
    const lista = opcoesPorQuestao.get(opcao.question_id) ?? [];
    lista.push({ id: opcao.id, correta: opcao.correta });
    opcoesPorQuestao.set(opcao.question_id, lista);
  }

  const questoes: QuestaoParaCorrigir[] = (questoesRaw ?? []).map((q) => ({
    id: q.id,
    tipo: q.tipo,
    peso: q.peso,
    opcoes: opcoesPorQuestao.get(q.id) ?? [],
  }));

  const { data: respostas } = await supabase
    .from("exam_answers")
    .select("id, question_id, option_id")
    .eq("attempt_id", attemptId);

  const resultado = corrigirTentativa(
    questoes,
    (respostas ?? []).map((r) => ({ questionId: r.question_id, optionId: r.option_id })),
  );

  const respostaIdPorQuestao = new Map(
    (respostas ?? []).map((r) => [r.question_id, r.id]),
  );

  await Promise.all(
    resultado.respostas.map((r) => {
      const respostaId = respostaIdPorQuestao.get(r.questionId);
      if (!respostaId) return Promise.resolve();
      return admin.from("exam_answers").update({ correta: r.correta }).eq("id", respostaId);
    }),
  );

  const { error } = await admin
    .from("exam_attempts")
    .update({
      enviado_em: new Date().toISOString(),
      status: "aguardando_correcao",
      nota_objetiva: resultado.notaObjetiva,
      nota_final: null,
      aprovado: null,
      corrigido_em: null,
    })
    .eq("id", attemptId);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível enviar a prova." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: attemptId });
}
