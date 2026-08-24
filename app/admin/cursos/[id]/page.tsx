import Link from "next/link";
import { notFound } from "next/navigation";
import { getCursoAdmin } from "@/lib/admin-cursos";
import { getExamsDoCurso } from "@/lib/admin-provas";
import { EditarCursoForm } from "@/components/admin/editar-curso-form";
import { AulasEditor } from "@/components/admin/aulas-editor";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  substituida: "Substituída",
};

export default async function AdminCursoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await getCursoAdmin(id);

  if (!dados) {
    notFound();
  }

  const { curso, aulas } = dados;
  const exams = await getExamsDoCurso(curso.id);
  const examAtual = exams.find((e) => e.status === "rascunho") ?? exams[0];

  return (
    <div className="space-y-8">
      <EditarCursoForm curso={curso} />
      <AulasEditor cursoId={curso.id} aulasIniciais={aulas} />

      <section className="rounded-lg border border-[var(--color-line)] bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Prova</h2>
          {examAtual && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-[var(--color-ink)]">
              {STATUS_LABEL[examAtual.status] ?? examAtual.status} · v{examAtual.versao}
            </span>
          )}
        </div>

        <Link
          href={`/admin/cursos/${curso.id}/prova`}
          className="mt-3 block rounded-lg bg-[var(--color-royal)] px-4 py-3 text-center text-sm font-medium text-white"
        >
          {examAtual ? "Ver / revisar prova" : "Criar prova a partir de texto"}
        </Link>
      </section>
    </div>
  );
}
