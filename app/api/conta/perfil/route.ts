import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";

  if (!nome) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nome })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível salvar o nome." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
