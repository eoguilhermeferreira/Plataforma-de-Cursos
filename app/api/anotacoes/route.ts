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
  const texto = typeof body?.texto === "string" ? body.texto : "";

  const { error } = await supabase.from("anotacoes").upsert(
    {
      user_id: user.id,
      texto,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível salvar a anotação." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
