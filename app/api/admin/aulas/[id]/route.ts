import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";

export async function PATCH(
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

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const updates: Record<string, unknown> = {};
  if (typeof body?.titulo === "string" && body.titulo.trim()) {
    updates.titulo = body.titulo.trim();
  }
  if (
    typeof body?.tempo_minimo_segundos === "number" &&
    body.tempo_minimo_segundos >= 0
  ) {
    updates.tempo_minimo_segundos = Math.round(body.tempo_minimo_segundos);
  }
  if (typeof body?.publicado === "boolean") {
    updates.publicado = body.publicado;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }
  updates.atualizado_em = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível atualizar a aula." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
