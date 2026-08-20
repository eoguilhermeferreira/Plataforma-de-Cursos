import { redirect } from "next/navigation";
import { getExamAtualDoCurso } from "@/lib/admin-provas";

export default async function AdminProvaIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const exam = await getExamAtualDoCurso(courseId);

  if (!exam) {
    redirect(`/admin/cursos/${courseId}/prova/nova`);
  }

  redirect(`/admin/cursos/${courseId}/prova/${exam.id}`);
}
