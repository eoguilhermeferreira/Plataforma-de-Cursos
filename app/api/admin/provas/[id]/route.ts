import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { inserirQuestoesEOpcoes } from "@/lib/exam-persist";
import type { TipoQuestao } from "@/lib/prova-parser";

const TIPOS_VALIDOS: TipoQuestao[] = ["objetiva", "verdadeiro_falso", "discursiva"];

/**
 * Salva o rascunho inteiro: configurações da prova + todas as questões e
 * alternativas de uma vez. A tela de revisão manda o estado completo, então
 * aqui é mais simples apagar as questões antigas e reinserir tudo do que
 * fazer diff campo a campo — só é permitido enquanto a prova é rascunho.
 */
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

  const { id: examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, status")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  }
  if (exam.status !== "rascunho") {
    return NextResponse.json(
      { error: "Prova publicada não pode ser editada. Crie uma nova versão." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const notaMinima = Number(body?.nota_minima);
  const tentativasMax = Number(body?.tentativas_max);
  const mostrarGabarito = Boolean(body?.mostrar_gabarito);
  const questoesBrutas: unknown[] = Array.isArray(body?.questoes) ? body.questoes : [];

  if (!titulo) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }
  if (!Number.isFinite(notaMinima) || notaMinima < 0 || notaMinima > 100) {
    return NextResponse.json({ error: "Nota mínima inválida." }, { status: 400 });
  }
  if (!Number.isFinite(tentativasMax) || tentativasMax < 1) {
    return NextResponse.json({ error: "Tentativas máximas inválida." }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("exams")
    .update({
      titulo,
      nota_minima: notaMinima,
      tentativas_max: Math.round(tentativasMax),
      mostrar_gabarito: mostrarGabarito,
    })
    .eq("id", examId);

  if (updateError) {
    return NextResponse.json(
      { error: "Não foi possível salvar as configurações da prova." },
      { status: 500 },
    );
  }

  await supabase.from("exam_questions").delete().eq("exam_id", examId);

  const questoesValidas = questoesBrutas
    .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
    .map((q, ordem) => {
      const opcoesBrutas = Array.isArray(q.opcoes) ? q.opcoes : [];
      return {
        ordem,
        tipo: TIPOS_VALIDOS.includes(q.tipo as TipoQuestao)
          ? (q.tipo as TipoQuestao)
          : ("objetiva" as TipoQuestao),
        enunciado: typeof q.enunciado === "string" ? q.enunciado : "",
        peso: Number.isFinite(Number(q.peso)) ? Number(q.peso) : 1,
        embaralhar: Boolean(q.embaralhar),
        opcoes: opcoesBrutas
          .filter((o): o is Record<string, unknown> => typeof o === "object" && o !== null)
          .map((o) => ({
            texto: typeof o.texto === "string" ? o.texto : "",
            correta: Boolean(o.correta),
          })),
      };
    });

  const { error: persistError } = await inserirQuestoesEOpcoes(
    supabase,
    examId,
    questoesValidas,
  );

  if (persistError) {
    return NextResponse.json(
      { error: "Não foi possível salvar as questões." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
