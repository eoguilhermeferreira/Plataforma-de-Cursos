import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, tempo_minimo_segundos, versao")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { data: progresso } = await supabase
    .from("lesson_progress")
    .select("segundos_lidos, concluido_em")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  if (progresso?.concluido_em) {
    return NextResponse.json({ ok: true, ja_concluida: true });
  }

  const segundosLidos = progresso?.segundos_lidos ?? 0;

  // O servidor decide, não o cliente: mesmo que o botão tenha sido
  // liberado na tela, a gravação só passa se o tempo acumulado no banco
  // (não o do navegador) já bateu o mínimo da aula.
  if (segundosLidos < lesson.tempo_minimo_segundos) {
    return NextResponse.json(
      {
        error: "Tempo mínimo de leitura ainda não atingido.",
        segundos_lidos: segundosLidos,
        tempo_minimo_segundos: lesson.tempo_minimo_segundos,
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lesson.id,
      segundos_lidos: segundosLidos,
      concluido_em: new Date().toISOString(),
      versao_lida: lesson.versao,
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível concluir a aula." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
