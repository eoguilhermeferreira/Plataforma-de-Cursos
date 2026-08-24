import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { listAllAuthUsers } from "@/lib/admin-users";

export type ResultadoLinha = {
  attemptId: string;
  userId: string;
  nome: string | null;
  email: string;
  enviadoEm: string;
  status: "aguardando_correcao" | "corrigida";
  notaFinal: number | null;
  aprovado: boolean | null;
};

export async function getResultadosDaProva(examId: string): Promise<ResultadoLinha[]> {
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("id, user_id, enviado_em, status, nota_final, aprovado")
    .eq("exam_id", examId)
    .not("enviado_em", "is", null)
    .order("enviado_em", { ascending: false });

  if (!attempts || attempts.length === 0) return [];

  const userIds = [...new Set(attempts.map((a) => a.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome")
    .in("id", userIds);
  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome]));

  const admin = createServiceRoleClient();
  const authUsers = await listAllAuthUsers(admin);
  const emailPorId = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));

  return attempts.map((a) => ({
    attemptId: a.id,
    userId: a.user_id,
    nome: nomePorId.get(a.user_id) ?? null,
    email: emailPorId.get(a.user_id) ?? "",
    enviadoEm: a.enviado_em as string,
    status: a.status as "aguardando_correcao" | "corrigida",
    notaFinal: a.nota_final,
    aprovado: a.aprovado,
  }));
}

export type CorrecaoPendente = {
  attemptId: string;
  examId: string;
  examTitulo: string;
  cursoTitulo: string;
  userId: string;
  nome: string | null;
  email: string;
  enviadoEm: string;
};

export async function getCorrecoesPendentes(): Promise<CorrecaoPendente[]> {
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, user_id, enviado_em, exams(titulo, courses(titulo))")
    .eq("status", "aguardando_correcao")
    .order("enviado_em", { ascending: true });

  if (!attempts || attempts.length === 0) return [];

  const userIds = [...new Set(attempts.map((a) => a.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome")
    .in("id", userIds);
  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome]));

  const admin = createServiceRoleClient();
  const authUsers = await listAllAuthUsers(admin);
  const emailPorId = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));

  return attempts.map((a) => {
    const exam = a.exams as unknown as { titulo: string; courses: { titulo: string } | null } | null;
    return {
      attemptId: a.id,
      examId: a.exam_id,
      examTitulo: exam?.titulo ?? "",
      cursoTitulo: exam?.courses?.titulo ?? "",
      userId: a.user_id,
      nome: nomePorId.get(a.user_id) ?? null,
      email: emailPorId.get(a.user_id) ?? "",
      enviadoEm: a.enviado_em as string,
    };
  });
}

export type EstatisticaQuestao = {
  questionId: string;
  ordem: number;
  enunciado: string;
  totalRespostas: number;
  acertos: number;
  percentualAcerto: number;
};

export async function getEstatisticasPorQuestao(
  examId: string,
): Promise<EstatisticaQuestao[]> {
  const supabase = await createClient();
  const { data: questoes } = await supabase
    .from("exam_questions")
    .select("id, ordem, enunciado")
    .eq("exam_id", examId)
    .order("ordem", { ascending: true });

  const questionIds = (questoes ?? []).map((q) => q.id);
  if (questionIds.length === 0) return [];

  const { data: respostas } = await supabase
    .from("exam_answers")
    .select("question_id, correta")
    .in("question_id", questionIds);

  const statsPorQuestao = new Map<string, { total: number; acertos: number }>();
  for (const r of respostas ?? []) {
    if (r.correta === null) continue;
    const atual = statsPorQuestao.get(r.question_id) ?? { total: 0, acertos: 0 };
    atual.total += 1;
    if (r.correta) atual.acertos += 1;
    statsPorQuestao.set(r.question_id, atual);
  }

  return (questoes ?? []).map((q) => {
    const stats = statsPorQuestao.get(q.id) ?? { total: 0, acertos: 0 };
    return {
      questionId: q.id,
      ordem: q.ordem,
      enunciado: q.enunciado,
      totalRespostas: stats.total,
      acertos: stats.acertos,
      percentualAcerto: stats.total > 0 ? (stats.acertos / stats.total) * 100 : 0,
    };
  });
}

export function gerarCsvResultados(linhas: ResultadoLinha[]): string {
  const cabecalho = ["Nome", "Email", "Data do envio", "Status", "Nota", "Aprovado"];
  const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;

  const corpo = linhas.map((l) =>
    [
      escapar(l.nome ?? ""),
      escapar(l.email),
      escapar(new Date(l.enviadoEm).toLocaleString("pt-BR")),
      escapar(l.status === "aguardando_correcao" ? "Em correção" : "Corrigida"),
      escapar(l.notaFinal !== null ? l.notaFinal.toFixed(1) : ""),
      escapar(l.aprovado === null ? "" : l.aprovado ? "Sim" : "Não"),
    ].join(","),
  );

  return [cabecalho.join(","), ...corpo].join("\n");
}
