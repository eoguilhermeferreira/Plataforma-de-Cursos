import { createClient } from "@/lib/supabase/server";
import type { TipoQuestao } from "@/lib/prova-parser";

export type ExamStatus = "rascunho" | "publicada" | "substituida";

export type ExamRow = {
  id: string;
  course_id: string;
  titulo: string;
  versao: number;
  status: ExamStatus;
  tentativas_max: number;
  nota_minima: number;
  mostrar_gabarito: boolean;
  criado_em: string;
};

export type QuestaoRow = {
  id: string;
  exam_id: string;
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  peso: number;
  embaralhar: boolean;
};

export type OpcaoRow = {
  id: string;
  question_id: string;
  ordem: number;
  texto: string;
  correta: boolean;
};

export type ProvaCompleta = {
  exam: ExamRow;
  questoes: (QuestaoRow & { opcoes: OpcaoRow[] })[];
};

export async function getProvaAdmin(examId: string): Promise<ProvaCompleta | null> {
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) return null;

  const { data: questoes } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", examId)
    .order("ordem", { ascending: true });

  const questionIds = (questoes ?? []).map((q) => q.id);
  const opcoesPorQuestao = new Map<string, OpcaoRow[]>();

  if (questionIds.length > 0) {
    const { data: opcoes } = await supabase
      .from("exam_options")
      .select("*")
      .in("question_id", questionIds)
      .order("ordem", { ascending: true });

    for (const opcao of opcoes ?? []) {
      const lista = opcoesPorQuestao.get(opcao.question_id) ?? [];
      lista.push(opcao);
      opcoesPorQuestao.set(opcao.question_id, lista);
    }
  }

  return {
    exam,
    questoes: (questoes ?? []).map((q) => ({
      ...q,
      opcoes: opcoesPorQuestao.get(q.id) ?? [],
    })),
  };
}

export async function getExamsDoCurso(courseId: string): Promise<ExamRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("*")
    .eq("course_id", courseId)
    .order("versao", { ascending: false });

  return data ?? [];
}

export async function getExamAtualDoCurso(courseId: string): Promise<ExamRow | null> {
  const exams = await getExamsDoCurso(courseId);
  const rascunho = exams.find((e) => e.status === "rascunho");
  if (rascunho) return rascunho;
  const publicada = exams.find((e) => e.status === "publicada");
  if (publicada) return publicada;
  return exams[0] ?? null;
}
