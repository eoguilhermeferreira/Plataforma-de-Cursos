import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getExamPublicadoDoCurso,
  getQuestoesParaResponder,
  type ExamAttemptRow,
} from "@/lib/exam-attempt";
import { ResponderProva } from "@/components/aluno/responder-prova";

export default async function ResponderProvaPage({
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

  const exam = await getExamPublicadoDoCurso(cursoId);
  if (!exam) {
    redirect(`/provas/${cursoId}`);
  }

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (!attempt) {
    redirect(`/provas/${cursoId}`);
  }

  const questoes = await getQuestoesParaResponder(attempt as ExamAttemptRow);

  return (
    <ResponderProva
      attemptId={attempt.id}
      cursoId={cursoId}
      tituloProva={exam.titulo}
      tentativasMax={exam.tentativas_max}
      questoes={questoes}
    />
  );
}
