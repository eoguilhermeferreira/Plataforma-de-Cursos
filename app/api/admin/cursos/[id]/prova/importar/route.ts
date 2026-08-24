import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { parseProvaTexto } from "@/lib/prova-parser";
import { inserirQuestoesEOpcoes } from "@/lib/exam-persist";

/**
 * Cola o texto da prova, gera um rascunho novo com as questões
 * interpretadas. Nunca publica direto (regra 10 do CLAUDE.md) — quem
 * decide publicar é a rota /api/admin/provas/[id]/publicar, depois da
 * revisão humana.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id: courseId } = await params;
  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto : "";

  if (!texto.trim()) {
    return NextResponse.json({ error: "Cole o texto da prova." }, { status: 400 });
  }

  const questoes = parseProvaTexto(texto);
  if (questoes.length === 0) {
    return NextResponse.json(
      { error: "Não foi possível identificar nenhuma questão no texto." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: curso } = await supabase
    .from("courses")
    .select("id, titulo")
    .eq("id", courseId)
    .maybeSingle();

  if (!curso) {
    return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  }

  // Reimportar substitui o rascunho anterior em vez de acumular rascunhos
  // soltos — provas já publicadas (ou substituídas) nunca são tocadas aqui.
  await supabase.from("exams").delete().eq("course_id", courseId).eq("status", "rascunho");

  const { data: examsExistentes } = await supabase
    .from("exams")
    .select("versao")
    .eq("course_id", courseId)
    .order("versao", { ascending: false })
    .limit(1);

  const proximaVersao = (examsExistentes?.[0]?.versao ?? 0) + 1;

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .insert({
      course_id: courseId,
      titulo: `Prova de ${curso.titulo}`,
      versao: proximaVersao,
      status: "rascunho",
      mostrar_gabarito: true,
    })
    .select("id")
    .single();

  if (examError || !exam) {
    return NextResponse.json(
      { error: "Não foi possível criar a prova." },
      { status: 500 },
    );
  }

  const { error: persistError } = await inserirQuestoesEOpcoes(
    supabase,
    exam.id,
    questoes.map((q) => ({
      ordem: q.ordem,
      tipo: q.tipo,
      enunciado: q.enunciado,
      peso: 1,
      embaralhar: q.embaralhar,
      opcoes: q.opcoes,
    })),
  );

  if (persistError) {
    await supabase.from("exams").delete().eq("id", exam.id);
    return NextResponse.json(
      { error: "Não foi possível salvar as questões importadas." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: exam.id });
}
