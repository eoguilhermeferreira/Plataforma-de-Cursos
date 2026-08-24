import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCursosComProgresso } from "@/lib/progresso";
import { IconCadeado } from "@/components/icons";

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
    <div className="px-4 py-6 md:px-10 md:py-8">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
        Minhas provas
      </h1>

      {cursos.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
          Você ainda não tem nenhum curso liberado.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cursos.map((curso) => {
            const faltam = curso.totalAulas - curso.aulasConcluidas;
            const liberada = curso.totalAulas > 0 && faltam === 0;

            return (
              <li
                key={curso.id}
                className="rounded-xl border border-[var(--color-line)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {curso.titulo}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                      {curso.totalAulas === 0
                        ? "Nenhuma aula publicada ainda."
                        : liberada
                          ? "Todas as aulas concluídas."
                          : `Faltam ${faltam} aula${faltam === 1 ? "" : "s"} para liberar.`}
                    </p>
                  </div>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      liberada
                        ? "bg-[var(--color-royal-soft)] text-[var(--color-royal)]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <IconCadeado aberto={liberada} className="h-4 w-4" />
                  </span>
                </div>

                {liberada ? (
                  <Link
                    href={`/provas/${curso.id}`}
                    className="mt-4 block w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[var(--color-royal-dark)]"
                  >
                    Ver prova
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm font-medium text-gray-400"
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
