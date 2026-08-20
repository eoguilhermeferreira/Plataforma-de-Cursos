import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUltimaTentativaEnviada, getResultadoTentativa } from "@/lib/exam-attempt";

export default async function ResultadoProvaPage({
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

  const attempt = await getUltimaTentativaEnviada(cursoId, user.id);
  if (!attempt) {
    redirect(`/provas/${cursoId}`);
  }

  const resultado = await getResultadoTentativa(attempt);
  if (!resultado) {
    redirect(`/provas/${cursoId}`);
  }

  const { exam, questoes } = resultado;
  const emCorrecao = attempt.status === "aguardando_correcao";
  const erradas = questoes.filter((q) => q.correta === false);

  return (
    <div className="px-4 py-6">
      <Link href="/provas" className="text-xs text-gray-500 underline">
        ← Voltar
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-gray-900">{exam.titulo}</h1>
      <p className="mt-1 text-xs text-gray-500">
        Enviada em{" "}
        {attempt.enviado_em &&
          new Date(attempt.enviado_em).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
      </p>

      {emCorrecao ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Em correção</p>
          <p className="mt-1 text-sm text-amber-700">
            Esta prova tem questão discursiva e está aguardando correção manual.
            Sua nota aparece aqui assim que a correção terminar.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-semibold text-gray-900">
                {attempt.nota_final?.toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500">Nota mínima: {exam.nota_minima}%</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                attempt.aprovado
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {attempt.aprovado ? "Aprovado" : "Reprovado"}
            </span>
          </div>

          {!attempt.aprovado && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Fale com o administrador para liberar uma nova tentativa.
            </p>
          )}
        </div>
      )}

      {!emCorrecao && erradas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-gray-900">
            Questões que você errou
          </h2>
          <ul className="mt-3 space-y-3">
            {erradas.map((questao) => (
              <li
                key={questao.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <p className="text-sm font-medium text-gray-900">
                  Questão {questao.ordem + 1}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                  {questao.enunciado}
                </p>

                {exam.mostrar_gabarito ? (
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
                        {opcao.escolhida && !opcao.correta && " · sua resposta"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Você errou esta questão.{" "}
                    <Link
                      href={`/cursos/${cursoId}`}
                      className="underline text-gray-700"
                    >
                      Revisar material da aula
                    </Link>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
