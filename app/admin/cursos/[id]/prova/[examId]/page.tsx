import Link from "next/link";
import { notFound } from "next/navigation";
import { getProvaAdmin } from "@/lib/admin-provas";
import { RevisaoProva } from "@/components/admin/revisao-prova";

export default async function RevisaoProvaPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id: courseId, examId } = await params;
  const prova = await getProvaAdmin(examId);

  if (!prova || prova.exam.course_id !== courseId) {
    notFound();
  }

  return (
    <div>
      <Link
        href={`/admin/cursos/${courseId}`}
        className="text-xs text-gray-500 underline"
      >
        ← Voltar para o curso
      </Link>

      <RevisaoProva cursoId={courseId} prova={prova} />
    </div>
  );
}
