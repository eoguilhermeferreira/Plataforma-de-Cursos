import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCursosComProgresso } from "@/lib/progresso";
import { getExamPublicadoDoCurso, getTentativasDoAluno } from "@/lib/exam-attempt";
import { IniciarProvaButton } from "@/components/aluno/iniciar-prova-button";

export default async function ProvaHubPage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const { cursoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cursos = await getCursosComProgresso(supabase, user.id);
  const curso = cursos.find((c) => c.id === cursoId);

  if (!curso) {
    notFound();
  }

  const liberada = curso.totalAulas > 0 && curso.aulasConcluidas === curso.totalAulas;
  if (!liberada) {
    redirect("/provas");
  }

  const exam = await getExamPublicadoDoCurso(cursoId);

  if (!exam) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-8">
        <Link href="/provas" className="text-xs text-[var(--color-ink-soft)] underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--color-ink)]">
          {curso.titulo}
        </h1>
        <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
          Todas as aulas concluídas! A prova ainda não foi publicada. Volte em
          breve.
        </p>
      </div>
    );
  }

  const tentativas = await getTentativasDoAluno(exam.id, user.id);
  const emAndamento = tentativas.find((t) => t.status === "em_andamento");
  const enviadas = tentativas.filter((t) => t.enviado_em);
  const ultimaEnviada = enviadas[0];

  const { data: grants } = await supabase
    .from("attempt_grants")
    .select("id")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id);

  const tentativasDisponiveis =
    exam.tentativas_max + (grants?.length ?? 0) - enviadas.length;

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <Link href="/provas" className="text-xs text-[var(--color-ink-soft)] underline">
        ← Voltar
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--color-ink)]">
        {exam.titulo}
      </h1>

      {emAndamento ? (
        <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <p className="text-sm text-[var(--color-ink-soft)]">
            Você tem uma prova em andamento.
          </p>
          <Link
            href={`/provas/${cursoId}/responder`}
            className="mt-3 block w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[var(--color-royal-dark)]"
          >
            Continuar prova
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {ultimaEnviada && (
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
              <p className="text-sm text-[var(--color-ink-soft)]">
                {ultimaEnviada.status === "aguardando_correcao"
                  ? "Sua última tentativa está em correção."
                  : ultimaEnviada.aprovado
                    ? "Você foi aprovado na sua última tentativa."
                    : "Você não atingiu a nota mínima na sua última tentativa."}
              </p>
              <Link
                href={`/provas/${cursoId}/resultado`}
                className="mt-3 block w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-center text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-royal-soft)]"
              >
                Ver resultado
              </Link>
            </div>
          )}

          {tentativasDisponiveis > 0 ? (
            <IniciarProvaButton examId={exam.id} cursoId={cursoId} />
          ) : (
            ultimaEnviada &&
            !ultimaEnviada.aprovado && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Fale com o administrador para liberar uma nova tentativa.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
