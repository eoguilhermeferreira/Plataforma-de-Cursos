import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";

export async function PATCH(request: Request) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const aulas: unknown[] = Array.isArray(body?.aulas) ? body.aulas : [];

  if (aulas.length === 0) {
    return NextResponse.json({ error: "Lista de aulas vazia." }, { status: 400 });
  }

  const supabase = await createClient();

  await Promise.all(
    aulas.map((aula, index) => {
      const id = (aula as { id?: unknown })?.id;
      if (typeof id !== "string") return Promise.resolve();
      return supabase.from("lessons").update({ ordem: index }).eq("id", id);
    }),
  );

  return NextResponse.json({ ok: true });
}
