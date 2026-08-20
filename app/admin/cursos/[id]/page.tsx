import { notFound } from "next/navigation";
import { getCursoAdmin } from "@/lib/admin-cursos";
import { getAlunosList } from "@/lib/admin-users";
import { EditarCursoForm } from "@/components/admin/editar-curso-form";
import { AulasEditor } from "@/components/admin/aulas-editor";
import { MatricularAluno } from "@/components/admin/matricular-aluno";

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

  const { curso, aulas, matriculas } = dados;
  const alunos = await getAlunosList();
  const alunosComConta = alunos.filter(
    (a): a is typeof a & { userId: string } => a.userId !== null,
  );

  return (
    <div className="space-y-8">
      <EditarCursoForm curso={curso} />
      <AulasEditor cursoId={curso.id} aulasIniciais={aulas} />
      <MatricularAluno
        cursoId={curso.id}
        alunos={alunosComConta}
        matriculas={matriculas}
      />
    </div>
  );
}
