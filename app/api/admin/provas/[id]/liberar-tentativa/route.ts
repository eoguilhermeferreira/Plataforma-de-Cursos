import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";

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

  const { id: examId } = await params;
  const body = await request.json().catch(() => null);
  const userId = typeof body?.user_id === "string" ? body.user_id : "";
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";

  if (!userId) {
    return NextResponse.json({ error: "Aluno é obrigatório." }, { status: 400 });
  }
  if (!motivo) {
    return NextResponse.json({ error: "Motivo é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("attempt_grants").insert({
    exam_id: examId,
    user_id: userId,
    motivo,
    criado_por: user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível liberar a nova tentativa." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
