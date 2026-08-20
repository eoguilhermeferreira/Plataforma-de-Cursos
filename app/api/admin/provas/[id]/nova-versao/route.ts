import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { getProvaAdmin } from "@/lib/admin-provas";
import { inserirQuestoesEOpcoes } from "@/lib/exam-persist";

/**
 * Duplica a prova publicada inteira (configurações + questões +
 * alternativas) num rascunho novo com versao + 1. A prova publicada em si
 * não é tocada — tentativas antigas continuam apontando pra ela (regra 11
 * do CLAUDE.md).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id: examId } = await params;
  const prova = await getProvaAdmin(examId);
  if (!prova) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }
  if (prova.exam.status !== "publicada") {
    return NextResponse.json(
      { error: "Só é possível criar nova versão a partir de uma prova publicada." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: novoExam, error: examError } = await supabase
    .from("exams")
    .insert({
      course_id: prova.exam.course_id,
      titulo: prova.exam.titulo,
      versao: prova.exam.versao + 1,
      status: "rascunho",
      tentativas_max: prova.exam.tentativas_max,
      nota_minima: prova.exam.nota_minima,
      mostrar_gabarito: prova.exam.mostrar_gabarito,
    })
    .select("id")
    .single();

  if (examError || !novoExam) {
    return NextResponse.json(
      { error: "Não foi possível criar a nova versão." },
      { status: 500 },
    );
  }

  const { error: persistError } = await inserirQuestoesEOpcoes(
    supabase,
    novoExam.id,
    prova.questoes.map((q) => ({
      ordem: q.ordem,
      tipo: q.tipo,
      enunciado: q.enunciado,
      peso: q.peso,
      embaralhar: q.embaralhar,
      opcoes: q.opcoes.map((o) => ({ texto: o.texto, correta: o.correta })),
    })),
  );

  if (persistError) {
    await supabase.from("exams").delete().eq("id", novoExam.id);
    return NextResponse.json(
      { error: "Não foi possível copiar as questões para a nova versão." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: novoExam.id });
}
