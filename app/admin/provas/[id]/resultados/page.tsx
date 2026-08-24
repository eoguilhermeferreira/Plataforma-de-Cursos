import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getResultadosDaProva, getEstatisticasPorQuestao } from "@/lib/admin-resultados";
import { ResultadosLista } from "@/components/admin/resultados-lista";

export default async function AdminResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = await params;
  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, titulo, course_id")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const [linhas, estatisticas] = await Promise.all([
    getResultadosDaProva(examId),
    getEstatisticasPorQuestao(examId),
  ]);

  return (
    <div>
      <Link
        href={`/admin/cursos/${exam.course_id}`}
        className="text-xs text-[var(--color-ink-soft)] underline"
      >
        ← Voltar para o curso
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">{exam.titulo}</h1>
        <a
          href={`/api/admin/provas/${examId}/resultados/csv`}
          className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs font-medium text-[var(--color-ink)]"
        >
          Exportar CSV
        </a>
      </div>

      {estatisticas.length > 0 && (
        <section className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            Acerto por questão
          </h2>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            Questão com menos de 40% de acerto vem destacada — ou o material está
            confuso, ou a questão está mal escrita.
          </p>
          <ul className="mt-3 space-y-2">
            {estatisticas.map((e) => (
              <li
                key={e.questionId}
                className={`rounded-lg border p-3 text-sm ${
                  e.totalRespostas > 0 && e.percentualAcerto < 40
                    ? "border-red-300 bg-red-50"
                    : "border-[var(--color-line)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[var(--color-ink)]">
                    Questão {e.ordem + 1}
                  </span>
                  <span className="text-xs text-[var(--color-ink-soft)]">
                    {e.totalRespostas > 0
                      ? `${e.percentualAcerto.toFixed(0)}% de acerto`
                      : "sem respostas ainda"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-soft)]">
                  {e.enunciado}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <ResultadosLista examId={examId} linhas={linhas} />
      </section>
    </div>
  );
}
