import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Autosave de uma resposta. RLS garante que só o dono da tentativa escreve,
 * e só enquanto ela estiver em_andamento — se a tentativa já foi enviada,
 * o update é rejeitado pela policy antes mesmo de chegar aqui.
 */
export async function POST(
  request: Request,
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
    .select("id, status")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ error: "Tentativa não encontrada." }, { status: 404 });
  }
  if (attempt.status !== "em_andamento") {
    return NextResponse.json(
      { error: "Esta tentativa já foi enviada e não pode mais ser alterada." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const questionId = typeof body?.question_id === "string" ? body.question_id : "";
  const optionId = typeof body?.option_id === "string" ? body.option_id : null;
  const textoResposta =
    typeof body?.texto_resposta === "string" ? body.texto_resposta : null;

  if (!questionId) {
    return NextResponse.json({ error: "Questão inválida." }, { status: 400 });
  }

  const { error } = await supabase.from("exam_answers").upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      option_id: optionId,
      texto_resposta: textoResposta,
    },
    { onConflict: "attempt_id,question_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível salvar a resposta." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
