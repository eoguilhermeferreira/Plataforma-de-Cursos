import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getResultadoTentativa, type ExamAttemptRow } from "@/lib/exam-attempt";

export default async function AdminTentativaDetalhePage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id: examId, attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!attempt) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", attempt.user_id)
    .maybeSingle();

  const admin = createServiceRoleClient();
  const { data: authUser } = await admin.auth.admin.getUserById(attempt.user_id);

  const resultado = await getResultadoTentativa(attempt as ExamAttemptRow, {
    forcarGabarito: true,
  });

  if (!resultado) {
    notFound();
  }

  return (
    <div>
      <Link
        href={`/admin/provas/${examId}/resultados`}
        className="text-xs text-gray-500 underline"
      >
        ← Voltar para resultados
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-gray-900">
        {profile?.nome || authUser.user?.email}
      </h1>
      <p className="text-xs text-gray-500">{authUser.user?.email}</p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {attempt.status === "aguardando_correcao"
              ? "Em correção"
              : `Nota: ${attempt.nota_final?.toFixed(0)}%`}
          </span>
          {attempt.status === "corrigida" && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                attempt.aprovado
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {attempt.aprovado ? "Aprovado" : "Reprovado"}
            </span>
          )}
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {resultado.questoes.map((questao) => (
          <li key={questao.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900">
              Questão {questao.ordem + 1}
              {questao.correta === true && (
                <span className="ml-2 text-xs text-green-700">✓ correta</span>
              )}
              {questao.correta === false && (
                <span className="ml-2 text-xs text-red-700">✗ errada</span>
              )}
              {questao.correta === null && questao.tipo === "discursiva" && (
                <span className="ml-2 text-xs text-amber-700">pendente</span>
              )}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
              {questao.enunciado}
            </p>

            {questao.tipo === "discursiva" ? (
              <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {questao.textoResposta || "(sem resposta)"}
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {questao.opcoes.map((opcao) => (
                  <li
                    key={opcao.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      opcao.correta
                        ? "border-green-300 bg-green-50 text-green-800"
                        : opcao.escolhida
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {opcao.texto}
                    {opcao.correta && " · correta"}
                    {opcao.escolhida && !opcao.correta && " · resposta do aluno"}
                    {opcao.escolhida && opcao.correta && " · resposta do aluno"}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
