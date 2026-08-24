import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import {
  MATERIAIS_BUCKET,
  originalPdfPath,
  watermarkedPdfPrefix,
} from "@/lib/materiais";
import { CAPAS_BUCKET } from "@/lib/capas";

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

/**
 * Apaga o curso inteiro: aulas, prova, tentativas etc. saem junto por
 * cascade no banco, mas os arquivos no Storage (PDFs, marcas d'água,
 * capa) precisam ser limpos manualmente antes.
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
  const { data: curso } = await supabase
    .from("courses")
    .select("id, capa_path")
    .eq("id", id)
    .maybeSingle();

  if (!curso) {
    return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  }

  const { data: aulas } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", id);

  const admin = createServiceRoleClient();

  for (const aula of aulas ?? []) {
    const { data: watermarks } = await admin.storage
      .from(MATERIAIS_BUCKET)
      .list(watermarkedPdfPrefix(aula.id));

    if (watermarks && watermarks.length > 0) {
      await admin.storage
        .from(MATERIAIS_BUCKET)
        .remove(watermarks.map((f) => `${watermarkedPdfPrefix(aula.id)}/${f.name}`));
    }

    await admin.storage.from(MATERIAIS_BUCKET).remove([originalPdfPath(aula.id)]);
  }

  if (curso.capa_path) {
    await admin.storage.from(CAPAS_BUCKET).remove([curso.capa_path]);
  }

  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível excluir o curso." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
