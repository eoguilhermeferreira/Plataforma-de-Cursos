import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { embaralharIds } from "@/lib/prova-embaralhar";

/**
 * Retoma a tentativa em_andamento se já existir uma, ou cria uma nova.
 * Toda validação de acesso (matrícula, aulas concluídas, tentativas
 * restantes) é feita pelo trigger de banco em exam_attempts — esta rota só
 * traduz o erro do banco pra uma resposta HTTP amigável. Isso garante que
 * a checagem vale mesmo pra quem chamar a rota direto, sem passar pela UI.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("id, versao")
    .eq("id", examId)
    .eq("status", "publicada")
    .maybeSingle();

  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }

  const { data: existente } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ id: existente.id, retomada: true });
  }

  const { data: questoes } = await supabase
    .from("exam_questions")
    .select("id, embaralhar")
    .eq("exam_id", examId);

  const questionIds = (questoes ?? []).map((q) => q.id);
  const opcoesPorQuestao = new Map<string, string[]>();

  if (questionIds.length > 0) {
    // O aluno não lê exam_options direto (RLS) — leitura pontual via
    // service_role, só id/question_id/ordem, nunca "correta".
    const admin = createServiceRoleClient();
    const { data: opcoes } = await admin
      .from("exam_options")
      .select("id, question_id, ordem")
      .in("question_id", questionIds)
      .order("ordem", { ascending: true });

    for (const opcao of opcoes ?? []) {
      const lista = opcoesPorQuestao.get(opcao.question_id) ?? [];
      lista.push(opcao.id);
      opcoesPorQuestao.set(opcao.question_id, lista);
    }
  }

  const ordemAlternativas: Record<string, string[]> = {};
  for (const questao of questoes ?? []) {
    if (!questao.embaralhar) continue;
    const ids = opcoesPorQuestao.get(questao.id) ?? [];
    if (ids.length > 0) ordemAlternativas[questao.id] = embaralharIds(ids);
  }

  const { data: novaTentativa, error } = await supabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      exam_versao: exam.versao,
      user_id: user.id,
      ordem_alternativas: ordemAlternativas,
    })
    .select("id")
    .single();

  if (error || !novaTentativa) {
    return NextResponse.json(
      { error: error?.message ?? "Não foi possível iniciar a prova." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: novaTentativa.id, retomada: false });
}
