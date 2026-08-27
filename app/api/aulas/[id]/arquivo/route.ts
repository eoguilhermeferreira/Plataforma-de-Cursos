import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { applyWatermark } from "@/lib/watermark";
import {
  MATERIAIS_BUCKET,
  watermarkedPdfPath,
} from "@/lib/materiais";

/**
 * Entrega o PDF de uma aula, sempre com marca d'água do aluno e sempre por
 * signed URL de 10 minutos. Nunca retorna o caminho do arquivo original.
 *
 * A autorização é a própria RLS de `lessons`: se o select não retornar
 * linha, o aluno não tem matrícula ativa (ou a aula não está publicada) —
 * isso já é o 403, sem precisar duplicar a checagem aqui.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, pdf_path, versao")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cpf")
    .eq("id", user.id)
    .single();

  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("watermarked_files")
    .select("path")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .eq("versao", lesson.versao)
    .maybeSingle();

  let finalPath = existing?.path ?? null;

  if (!finalPath) {
    const { data: originalFile, error: downloadError } = await admin.storage
      .from(MATERIAIS_BUCKET)
      .download(lesson.pdf_path);

    if (downloadError || !originalFile) {
      return NextResponse.json(
        { error: "Material não encontrado." },
        { status: 404 },
      );
    }

    const originalBytes = new Uint8Array(await originalFile.arrayBuffer());
    const watermarked = await applyWatermark(originalBytes, {
      nome: profile?.nome || user.email || "Aluno",
      cpf: profile?.cpf ?? null,
      email: user.email ?? "",
      data: new Date().toLocaleDateString("pt-BR"),
    });

    const path = watermarkedPdfPath(lesson.id, user.id, lesson.versao);

    const { error: uploadError } = await admin.storage
      .from(MATERIAIS_BUCKET)
      .upload(path, watermarked, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Não foi possível preparar o material." },
        { status: 500 },
      );
    }

    const { error: insertError } = await admin.from("watermarked_files").insert({
      user_id: user.id,
      lesson_id: lesson.id,
      versao: lesson.versao,
      path,
    });

    if (insertError) {
      // Corrida: duas abas pediram a mesma aula ao mesmo tempo e ambas
      // geraram o arquivo. A unique (user_id, lesson_id, versao) barra a
      // segunda inserção — usa a linha que ganhou a corrida em vez de
      // deixar dois arquivos órfãos no bucket.
      const { data: race } = await admin
        .from("watermarked_files")
        .select("path")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .eq("versao", lesson.versao)
        .maybeSingle();
      finalPath = race?.path ?? path;
    } else {
      finalPath = path;
    }
  }

  const download = new URL(request.url).searchParams.get("download") === "1";

  // Download continua indo por signed URL (o navegador baixa direto do
  // Storage). Pra leitura embutida, servimos os bytes por essa própria rota
  // em vez de redirecionar: evita que o leitor de PDF do celular precise
  // seguir um redirect cross-origin com Range request, que é onde o iOS
  // Safari falhava em renderizar o conteúdo.
  if (download) {
    const { data: signed, error: signError } = await admin.storage
      .from(MATERIAIS_BUCKET)
      .createSignedUrl(finalPath, 600, { download: true });

    if (signError || !signed) {
      return NextResponse.json(
        { error: "Não foi possível gerar o link do material." },
        { status: 500 },
      );
    }

    const response = NextResponse.redirect(signed.signedUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const { data: fileBlob, error: fileError } = await admin.storage
    .from(MATERIAIS_BUCKET)
    .download(finalPath);

  if (fileError || !fileBlob) {
    return NextResponse.json(
      { error: "Não foi possível carregar o material." },
      { status: 500 },
    );
  }

  return new NextResponse(await fileBlob.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  });
}
