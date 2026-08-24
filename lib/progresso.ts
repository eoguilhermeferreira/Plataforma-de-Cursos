import type { SupabaseClient } from "@supabase/supabase-js";

export type CursoComProgresso = {
  id: string;
  titulo: string;
  descricao: string | null;
  capaPath: string | null;
  totalAulas: number;
  aulasConcluidas: number;
};

/**
 * Todo curso publicado, com contagem de aulas publicadas e quantas o aluno
 * já concluiu. RLS já garante que só voltam cursos publicados pra aluno com
 * conta ativa (ou tudo, se for admin) — não depende mais de matrícula.
 */
export async function getCursosComProgresso(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<CursoComProgresso[]> {
  const { data: cursos } = await supabase
    .from("courses")
    .select("id, titulo, descricao, capa_path")
    .eq("publicado", true);

  if (!cursos || cursos.length === 0) return [];

  const courseIds = cursos.map((c) => c.id);

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, course_id")
    .in("course_id", courseIds)
    .eq("publicado", true);

  const totalPorCurso = new Map<string, number>();
  const lessonToCourse = new Map<string, string>();
  for (const lesson of lessons ?? []) {
    totalPorCurso.set(lesson.course_id, (totalPorCurso.get(lesson.course_id) ?? 0) + 1);
    lessonToCourse.set(lesson.id, lesson.course_id);
  }

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const concluidasPorCurso = new Map<string, number>();

  if (lessonIds.length > 0) {
    const { data: progresso } = await supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId)
      .not("concluido_em", "is", null)
      .in("lesson_id", lessonIds);

    for (const p of progresso ?? []) {
      const courseId = lessonToCourse.get(p.lesson_id);
      if (!courseId) continue;
      concluidasPorCurso.set(courseId, (concluidasPorCurso.get(courseId) ?? 0) + 1);
    }
  }

  return cursos.map((curso) => ({
    id: curso.id,
    titulo: curso.titulo,
    descricao: curso.descricao,
    capaPath: curso.capa_path,
    totalAulas: totalPorCurso.get(curso.id) ?? 0,
    aulasConcluidas: concluidasPorCurso.get(curso.id) ?? 0,
  }));
}

export type AulaComStatus = {
  id: string;
  titulo: string;
  ordem: number;
  versao: number;
  tempo_minimo_segundos: number;
  status: "nao_iniciada" | "em_andamento" | "concluida";
  concluidoEm: string | null;
  versaoLida: number | null;
};

export type CursoDetalhe = {
  curso: { id: string; titulo: string; descricao: string | null };
  aulas: AulaComStatus[];
};

/**
 * Curso + aulas publicadas com o status de progresso do aluno. Retorna null
 * se o curso não existir ou o aluno não tiver acesso (RLS filtra sozinho).
 */
export async function getCursoDetalhe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  courseId: string,
): Promise<CursoDetalhe | null> {
  const { data: curso } = await supabase
    .from("courses")
    .select("id, titulo, descricao")
    .eq("id", courseId)
    .maybeSingle();

  if (!curso) return null;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, titulo, ordem, versao, tempo_minimo_segundos")
    .eq("course_id", courseId)
    .eq("publicado", true)
    .order("ordem", { ascending: true });

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const progressoPorAula = new Map<
    string,
    { segundos_lidos: number; concluido_em: string | null; versao_lida: number | null }
  >();

  if (lessonIds.length > 0) {
    const { data: progresso } = await supabase
      .from("lesson_progress")
      .select("lesson_id, segundos_lidos, concluido_em, versao_lida")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds);

    for (const p of progresso ?? []) {
      progressoPorAula.set(p.lesson_id, p);
    }
  }

  const aulas: AulaComStatus[] = (lessons ?? []).map((lesson) => {
    const progresso = progressoPorAula.get(lesson.id);
    const status: AulaComStatus["status"] = progresso?.concluido_em
      ? "concluida"
      : (progresso?.segundos_lidos ?? 0) > 0
        ? "em_andamento"
        : "nao_iniciada";

    return {
      id: lesson.id,
      titulo: lesson.titulo,
      ordem: lesson.ordem,
      versao: lesson.versao,
      tempo_minimo_segundos: lesson.tempo_minimo_segundos,
      status,
      concluidoEm: progresso?.concluido_em ?? null,
      versaoLida: progresso?.versao_lida ?? null,
    };
  });

  return { curso, aulas };
}
