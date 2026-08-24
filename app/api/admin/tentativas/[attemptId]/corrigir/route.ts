import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";

/**
 * Finaliza a correção de uma tentativa: toda tentativa enviada fica em
 * aguardando_correcao até o admin analisar e confirmar a nota aqui — a
 * correção automática das objetivas é só uma referência, nunca decide
 * sozinha (decisão de negócio registrada no CLAUDE.md).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { attemptId } = await params;
  const body = await request.json().catch(() => null);
  const notaFinal = Number(body?.nota_final);

  if (!Number.isFinite(notaFinal) || notaFinal < 0 || notaFinal > 100) {
    return NextResponse.json(
      { error: "Nota inválida. Use um valor entre 0 e 100." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ error: "Tentativa não encontrada." }, { status: 404 });
  }
  if (attempt.status === "em_andamento") {
    return NextResponse.json(
      { error: "Esta tentativa ainda não foi enviada pelo aluno." },
      { status: 400 },
    );
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("nota_minima")
    .eq("id", attempt.exam_id)
    .maybeSingle();

  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }

  const { error } = await supabase
    .from("exam_attempts")
    .update({
      status: "corrigida",
      nota_final: notaFinal,
      aprovado: notaFinal >= exam.nota_minima,
      avaliador_id: user.id,
      corrigido_em: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível salvar a correção." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
