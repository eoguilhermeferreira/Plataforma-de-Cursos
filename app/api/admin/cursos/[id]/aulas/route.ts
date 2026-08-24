import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { MATERIAIS_BUCKET, PDF_MAX_BYTES, originalPdfPath } from "@/lib/materiais";

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

  const { id: courseId } = await params;
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const titulo = String(form.get("titulo") ?? "").trim();
  const tempoMinimoRaw = form.get("tempo_minimo_segundos");
  const tempoMinimo = tempoMinimoRaw ? Number(tempoMinimoRaw) : 180;
  const file = form.get("pdf");

  if (!titulo) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }
  if (file.size > PDF_MAX_BYTES) {
    return NextResponse.json(
      { error: "O PDF não pode passar de 50MB." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(tempoMinimo) || tempoMinimo < 0) {
    return NextResponse.json({ error: "Tempo mínimo inválido." }, { status: 400 });
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { data: lesson, error: insertError } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      titulo,
      ordem: count ?? 0,
      pdf_path: "pendente",
      tempo_minimo_segundos: Math.round(tempoMinimo),
      publicado: true,
    })
    .select("id")
    .single();

  if (insertError || !lesson) {
    return NextResponse.json(
      { error: "Não foi possível criar a aula." },
      { status: 500 },
    );
  }

  const admin = createServiceRoleClient();
  const path = originalPdfPath(lesson.id);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(MATERIAIS_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    await supabase.from("lessons").delete().eq("id", lesson.id);
    return NextResponse.json(
      { error: "Não foi possível enviar o PDF." },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("lessons")
    .update({ pdf_path: path, atualizado_em: new Date().toISOString() })
    .eq("id", lesson.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Não foi possível salvar a aula." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: lesson.id });
}
