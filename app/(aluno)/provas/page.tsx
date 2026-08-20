import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCursosComProgresso } from "@/lib/progresso";

export default async function ProvasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cursos = await getCursosComProgresso(supabase, user.id);

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900">Minhas provas</h1>

      {cursos.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          Você ainda não tem nenhum curso liberado.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {cursos.map((curso) => {
            const faltam = curso.totalAulas - curso.aulasConcluidas;
            const liberada = curso.totalAulas > 0 && faltam === 0;

            return (
              <li
                key={curso.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {curso.titulo}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {curso.totalAulas === 0
                        ? "Nenhuma aula publicada ainda."
                        : liberada
                          ? "Todas as aulas concluídas."
                          : `Faltam ${faltam} aula${faltam === 1 ? "" : "s"} para liberar.`}
                    </p>
                  </div>
                  <span className="text-2xl" aria-hidden>
                    {liberada ? "🔓" : "🔒"}
                  </span>
                </div>

                {liberada ? (
                  <Link
                    href={`/provas/${curso.id}`}
                    className="mt-4 block w-full rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white"
                  >
                    Ver prova
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-400"
                  >
                    Prova bloqueada
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
