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
  const userId = typeof body?.user_id === "string" ? body.user_id : "";
  const courseId = typeof body?.course_id === "string" ? body.course_id : "";

  if (!userId || !courseId) {
    return NextResponse.json(
      { error: "Aluno e curso são obrigatórios." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").upsert(
    {
      user_id: userId,
      course_id: courseId,
      origem: "convite",
      status: "ativa",
      revogado_em: null,
      motivo_revogacao: null,
    },
    { onConflict: "user_id,course_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível matricular o aluno." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
