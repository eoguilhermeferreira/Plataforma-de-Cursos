import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import {
  MATERIAIS_BUCKET,
  PDF_MAX_BYTES,
  originalPdfPath,
  watermarkedPdfPrefix,
} from "@/lib/materiais";

/**
 * Substitui o PDF de uma aula já existente: incrementa a versão e limpa as
 * cópias com marca d'água antigas (elas correspondem à versão anterior e
 * não podem continuar sendo servidas).
 */
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

  const { id: lessonId } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("pdf");

  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }
  if (file.size > PDF_MAX_BYTES) {
    return NextResponse.json(
      { error: "O PDF não pode passar de 50MB." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, versao")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const path = originalPdfPath(lesson.id);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(MATERIAIS_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: "Não foi possível enviar o PDF." },
      { status: 500 },
    );
  }

  const novaVersao = lesson.versao + 1;

  const { error: updateError } = await supabase
    .from("lessons")
    .update({ versao: novaVersao, atualizado_em: new Date().toISOString() })
    .eq("id", lesson.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Não foi possível salvar a nova versão." },
      { status: 500 },
    );
  }

  const { data: antigos } = await admin.storage
    .from(MATERIAIS_BUCKET)
    .list(watermarkedPdfPrefix(lesson.id));

  if (antigos && antigos.length > 0) {
    await admin.storage
      .from(MATERIAIS_BUCKET)
      .remove(antigos.map((f) => `${watermarkedPdfPrefix(lesson.id)}/${f.name}`));
  }

  await admin.from("watermarked_files").delete().eq("lesson_id", lesson.id);

  return NextResponse.json({ ok: true, versao: novaVersao });
}
