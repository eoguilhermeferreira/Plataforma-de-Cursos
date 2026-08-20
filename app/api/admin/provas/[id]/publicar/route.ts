import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { getProvaAdmin } from "@/lib/admin-provas";
import { avaliarProva, temAvisoBloqueante } from "@/lib/prova-revisao";

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
  if (prova.exam.status !== "rascunho") {
    return NextResponse.json(
      { error: "Só um rascunho pode ser publicado." },
      { status: 400 },
    );
  }

  const avisos = avaliarProva(
    prova.questoes.map((q) => ({
      ordem: q.ordem,
      tipo: q.tipo,
      enunciado: q.enunciado,
      opcoes: q.opcoes.map((o) => ({ texto: o.texto, correta: o.correta })),
    })),
  );

  if (temAvisoBloqueante(avisos)) {
    return NextResponse.json(
      { error: "Existem avisos bloqueando a publicação.", avisos },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Um curso só tem uma prova "publicada" por vez (índice único parcial no
  // banco garante isso): a antiga vira "substituida" antes desta virar
  // "publicada", senão a constraint rejeita a segunda linha.
  await supabase
    .from("exams")
    .update({ status: "substituida" })
    .eq("course_id", prova.exam.course_id)
    .eq("status", "publicada");

  const { error } = await supabase
    .from("exams")
    .update({ status: "publicada" })
    .eq("id", examId);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível publicar a prova." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
