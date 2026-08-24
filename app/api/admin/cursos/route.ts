import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";

export async function POST(request: Request) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const descricao =
    typeof body?.descricao === "string" ? body.descricao.trim() || null : null;

  if (!titulo) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ titulo, descricao })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Não foi possível criar o curso." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id });
}
