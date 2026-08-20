import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCursosComProgresso } from "@/lib/progresso";

export default async function CursosPage() {
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
      <h1 className="text-xl font-semibold text-gray-900">Meus cursos</h1>

      {cursos.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          Você ainda não tem nenhum curso liberado. Fale com o admin.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {cursos.map((curso) => {
            const percentual =
              curso.totalAulas === 0
                ? 0
                : Math.round((curso.aulasConcluidas / curso.totalAulas) * 100);

            return (
              <li key={curso.id}>
                <Link
                  href={`/cursos/${curso.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4"
                >
                  <p className="text-sm font-medium text-gray-900">{curso.titulo}</p>
                  {curso.descricao && (
                    <p className="mt-1 text-xs text-gray-500">{curso.descricao}</p>
                  )}

                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {curso.aulasConcluidas} de {curso.totalAulas} aulas concluídas
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
