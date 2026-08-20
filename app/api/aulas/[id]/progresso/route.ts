import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Um pouco acima dos 30s do heartbeat do cliente, só pra dar folga de rede.
// O objetivo é impedir que uma única requisição forjada pule o tempo
// mínimo inteiro de uma vez — quem decide se pode concluir é sempre o
// servidor, nunca o valor que o cliente manda.
const INCREMENTO_MAXIMO_SEGUNDOS = 40;

export async function POST(
  request: Request,
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
    .select("id, tempo_minimo_segundos")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const incrementoRaw = typeof body?.segundos === "number" ? body.segundos : 0;
  const incremento = Math.max(0, Math.min(incrementoRaw, INCREMENTO_MAXIMO_SEGUNDOS));

  const { data: atual } = await supabase
    .from("lesson_progress")
    .select("segundos_lidos, concluido_em")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  if (atual?.concluido_em) {
    return NextResponse.json({
      segundos_lidos: atual.segundos_lidos,
      tempo_minimo_segundos: lesson.tempo_minimo_segundos,
      pode_concluir: true,
    });
  }

  const novoSegundos = (atual?.segundos_lidos ?? 0) + incremento;

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lesson.id,
      segundos_lidos: novoSegundos,
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível registrar o progresso." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    segundos_lidos: novoSegundos,
    tempo_minimo_segundos: lesson.tempo_minimo_segundos,
    pode_concluir: novoSegundos >= lesson.tempo_minimo_segundos,
  });
}
