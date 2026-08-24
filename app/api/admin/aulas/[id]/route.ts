import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import {
  MATERIAIS_BUCKET,
  originalPdfPath,
  watermarkedPdfPrefix,
} from "@/lib/materiais";

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

/**
 * Apaga a aula: remove o PDF original e as cópias com marca d'água do
 * bucket antes de apagar a linha (lesson_progress e watermarked_files caem
 * junto por cascade, mas os arquivos no Storage não).
 */
export async function DELETE(
  _request: Request,
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
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  }

  const admin = createServiceRoleClient();

  const { data: watermarks } = await admin.storage
    .from(MATERIAIS_BUCKET)
    .list(watermarkedPdfPrefix(id));

  if (watermarks && watermarks.length > 0) {
    await admin.storage
      .from(MATERIAIS_BUCKET)
      .remove(watermarks.map((f) => `${watermarkedPdfPrefix(id)}/${f.name}`));
  }

  await admin.storage.from(MATERIAIS_BUCKET).remove([originalPdfPath(id)]);

  const { error } = await supabase.from("lessons").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível excluir a aula." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
