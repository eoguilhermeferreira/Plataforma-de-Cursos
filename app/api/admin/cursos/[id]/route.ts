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
  if (typeof body?.descricao === "string") {
    updates.descricao = body.descricao.trim() || null;
  }
  if (typeof body?.publicado === "boolean") {
    updates.publicado = body.publicado;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courses").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível atualizar o curso." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
