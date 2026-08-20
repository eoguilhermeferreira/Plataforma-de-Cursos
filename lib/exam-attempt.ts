import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ordenarPorSalvo } from "@/lib/prova-embaralhar";
import type { TipoQuestao } from "@/lib/prova-parser";

export type ExamAttemptStatus = "em_andamento" | "aguardando_correcao" | "corrigida";

export type ExamAttemptRow = {
  id: string;
  exam_id: string;
  exam_versao: number;
  user_id: string;
  iniciado_em: string;
  enviado_em: string | null;
  status: ExamAttemptStatus;
  ordem_alternativas: Record<string, string[]>;
  nota_objetiva: number | null;
  nota_final: number | null;
  aprovado: boolean | null;
  avaliador_id: string | null;
  corrigido_em: string | null;
};

export type ExamRowPublico = {
  id: string;
  course_id: string;
  titulo: string;
  versao: number;
  tentativas_max: number;
  nota_minima: number;
  mostrar_gabarito: boolean;
};

/** Prova publicada vigente do curso, do jeito que o RLS já entrega pro aluno matriculado. */
export async function getExamPublicadoDoCurso(
  courseId: string,
): Promise<ExamRowPublico | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("id, course_id, titulo, versao, tentativas_max, nota_minima, mostrar_gabarito")
    .eq("course_id", courseId)
    .eq("status", "publicada")
    .maybeSingle();
  return data ?? null;
}

export async function getTentativasDoAluno(
  examId: string,
  userId: string,
): Promise<ExamAttemptRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .order("iniciado_em", { ascending: false });
  return (data ?? []) as ExamAttemptRow[];
}

/**
 * Última tentativa enviada do aluno pra esse curso, em qualquer versão da
 * prova (uma tentativa antiga continua apontando pra versão que ela
 * respondeu, mesmo depois de uma nova versão ser publicada).
 */
export async function getUltimaTentativaEnviada(
  courseId: string,
  userId: string,
): Promise<ExamAttemptRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_attempts")
    .select("*, exams!inner(course_id)")
    .eq("user_id", userId)
    .eq("exams.course_id", courseId)
    .not("enviado_em", "is", null)
    .order("iniciado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return data as ExamAttemptRow;
}

export async function getTentativa(attemptId: string): Promise<ExamAttemptRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  return (data as ExamAttemptRow) ?? null;
}

export type OpcaoParaResponder = { id: string; texto: string };
export type QuestaoParaResponder = {
  id: string;
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  opcoes: OpcaoParaResponder[];
  respostaAtual: { optionId: string | null; textoResposta: string | null };
};

/**
 * Questões + alternativas na ordem sorteada da tentativa, com a resposta já
 * marcada preenchida (retomar do ponto onde parou) — nunca inclui
 * "correta". O aluno não pode ler exam_options direto (RLS), então essa
 * leitura usa service_role só pra pegar id/texto das opções.
 */
export async function getQuestoesParaResponder(
  attempt: ExamAttemptRow,
): Promise<QuestaoParaResponder[]> {
  const supabase = await createClient();
  const admin = createServiceRoleClient();

  const { data: questoes } = await supabase
    .from("exam_questions")
    .select("id, ordem, tipo, enunciado")
    .eq("exam_id", attempt.exam_id)
    .order("ordem", { ascending: true });

  const questionIds = (questoes ?? []).map((q) => q.id);
  const opcoesPorQuestao = new Map<string, OpcaoParaResponder[]>();

  if (questionIds.length > 0) {
    const { data: opcoes } = await admin
      .from("exam_options")
      .select("id, question_id, ordem, texto")
      .in("question_id", questionIds)
      .order("ordem", { ascending: true });

    for (const opcao of opcoes ?? []) {
      const lista = opcoesPorQuestao.get(opcao.question_id) ?? [];
      lista.push({ id: opcao.id, texto: opcao.texto });
      opcoesPorQuestao.set(opcao.question_id, lista);
    }
  }

  const { data: respostas } = await supabase
    .from("exam_answers")
    .select("question_id, option_id, texto_resposta")
    .eq("attempt_id", attempt.id);

  const respostaPorQuestao = new Map(
    (respostas ?? []).map((r) => [r.question_id, r]),
  );

  return (questoes ?? []).map((q) => {
    const opcoesOriginais = opcoesPorQuestao.get(q.id) ?? [];
    const opcoes = ordenarPorSalvo(opcoesOriginais, attempt.ordem_alternativas?.[q.id]);
    const resposta = respostaPorQuestao.get(q.id);

    return {
      id: q.id,
      ordem: q.ordem,
      tipo: q.tipo,
      enunciado: q.enunciado,
      opcoes,
      respostaAtual: {
        optionId: resposta?.option_id ?? null,
        textoResposta: resposta?.texto_resposta ?? null,
      },
    };
  });
}

export type QuestaoResultado = {
  id: string;
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  peso: number;
  opcoes: { id: string; texto: string; escolhida: boolean; correta: boolean | null }[];
  correta: boolean | null;
  textoResposta: string | null;
};

export type ResultadoTentativa = {
  attempt: ExamAttemptRow;
  exam: { titulo: string; nota_minima: number; mostrar_gabarito: boolean };
  questoes: QuestaoResultado[];
};

/**
 * Monta a tela de resultado. Se mostrar_gabarito for false, "correta" das
 * alternativas nunca é preenchido no objeto retornado — não é só escondido
 * na tela, o dado nem sai do servidor pro componente cliente.
 */
export async function getResultadoTentativa(
  attempt: ExamAttemptRow,
  config: { forcarGabarito?: boolean } = {},
): Promise<ResultadoTentativa | null> {
  const supabase = await createClient();
  const admin = createServiceRoleClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("titulo, nota_minima, mostrar_gabarito")
    .eq("id", attempt.exam_id)
    .maybeSingle();

  if (!exam) return null;

  const { data: questoes } = await supabase
    .from("exam_questions")
    .select("id, ordem, tipo, enunciado, peso")
    .eq("exam_id", attempt.exam_id)
    .order("ordem", { ascending: true });

  const questionIds = (questoes ?? []).map((q) => q.id);
  const opcoesPorQuestao = new Map<
    string,
    { id: string; texto: string; correta: boolean }[]
  >();

  if (questionIds.length > 0) {
    const { data: opcoes } = await admin
      .from("exam_options")
      .select("id, question_id, ordem, texto, correta")
      .in("question_id", questionIds)
      .order("ordem", { ascending: true });

    for (const opcao of opcoes ?? []) {
      const lista = opcoesPorQuestao.get(opcao.question_id) ?? [];
      lista.push({ id: opcao.id, texto: opcao.texto, correta: opcao.correta });
      opcoesPorQuestao.set(opcao.question_id, lista);
    }
  }

  const { data: respostas } = await supabase
    .from("exam_answers")
    .select("question_id, option_id, texto_resposta, correta")
    .eq("attempt_id", attempt.id);

  const respostaPorQuestao = new Map((respostas ?? []).map((r) => [r.question_id, r]));

  const questoesResultado: QuestaoResultado[] = (questoes ?? []).map((q) => {
    const opcoesOriginais = opcoesPorQuestao.get(q.id) ?? [];
    const opcoesOrdenadas = ordenarPorSalvo(
      opcoesOriginais,
      attempt.ordem_alternativas?.[q.id],
    );
    const resposta = respostaPorQuestao.get(q.id);

    return {
      id: q.id,
      ordem: q.ordem,
      tipo: q.tipo,
      enunciado: q.enunciado,
      peso: q.peso,
      opcoes: opcoesOrdenadas.map((o) => ({
        id: o.id,
        texto: o.texto,
        escolhida: resposta?.option_id === o.id,
        correta: config.forcarGabarito || exam.mostrar_gabarito ? o.correta : null,
      })),
      correta: resposta?.correta ?? null,
      textoResposta: resposta?.texto_resposta ?? null,
    };
  });

  return { attempt, exam, questoes: questoesResultado };
}
