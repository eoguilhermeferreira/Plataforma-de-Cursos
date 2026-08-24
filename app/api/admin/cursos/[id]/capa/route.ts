import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import {
  CAPAS_BUCKET,
  CAPA_MAX_BYTES,
  CAPA_MIME_EXT,
  getCapaUrl,
  novoCapaPath,
} from "@/lib/capas";

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
  const file = form?.get("capa");

  if (!(file instanceof File) || !(file.type in CAPA_MIME_EXT)) {
    return NextResponse.json(
      { error: "Envie uma imagem JPEG, PNG ou WebP." },
      { status: 400 },
    );
  }
  if (file.size > CAPA_MAX_BYTES) {
    return NextResponse.json(
      { error: "A imagem não pode passar de 5MB." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: curso } = await supabase
    .from("courses")
    .select("id, capa_path")
    .eq("id", courseId)
    .maybeSingle();

  if (!curso) {
    return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const path = novoCapaPath(courseId, file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(CAPAS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: "Não foi possível enviar a imagem." },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("courses")
    .update({ capa_path: path })
    .eq("id", courseId);

  if (updateError) {
    await admin.storage.from(CAPAS_BUCKET).remove([path]);
    return NextResponse.json(
      { error: "Não foi possível salvar a capa." },
      { status: 500 },
    );
  }

  if (curso.capa_path) {
    await admin.storage.from(CAPAS_BUCKET).remove([curso.capa_path]);
  }

  return NextResponse.json({ path, url: getCapaUrl(path) });
}
