import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCursosComProgresso } from "@/lib/progresso";
import { getCapaUrl } from "@/lib/capas";
import { ProgressRing } from "@/components/progress-ring";
import { IconLivro } from "@/components/icons";

export default async function CursosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, cursos] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).single(),
    getCursosComProgresso(supabase, user.id),
  ]);

  const totalAulas = cursos.reduce((soma, c) => soma + c.totalAulas, 0);
  const totalConcluidas = cursos.reduce((soma, c) => soma + c.aulasConcluidas, 0);
  const percentualGeral = totalAulas === 0 ? 0 : (totalConcluidas / totalAulas) * 100;
  const primeiroNome = (profile?.nome ?? user.email ?? "").split(" ")[0];

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          Olá, {primeiroNome}!
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Continue seus estudos de onde parou.
        </p>
      </header>

      <div className="lg:flex lg:gap-8">
        <div className="lg:flex-1">
          <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">
            Meus cursos
          </h2>

          {cursos.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-royal-soft)] p-6 text-center">
              <p className="text-sm text-[var(--color-ink-soft)]">
                Você ainda não tem nenhum curso liberado. Fale com o administrador.
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {cursos.map((curso) => {
                const percentual =
                  curso.totalAulas === 0
                    ? 0
                    : Math.round((curso.aulasConcluidas / curso.totalAulas) * 100);
                const capaUrl = getCapaUrl(curso.capaPath);

                return (
                  <li key={curso.id} className="mr-1.5 mb-1.5">
                    <Link
                      href={`/cursos/${curso.id}`}
                      className="book-card group block rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] transition-transform hover:-translate-y-0.5"
                    >
                      <div className="aspect-[2/3] w-full overflow-hidden rounded-t-xl">
                        {capaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={capaUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="book-spine flex h-full w-full items-center justify-center">
                            <IconLivro className="h-10 w-10 text-white/70" />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <p className="font-display text-sm font-semibold text-[var(--color-ink)]">
                          {curso.titulo}
                        </p>
                        {curso.descricao && (
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-soft)]">
                            {curso.descricao}
                          </p>
                        )}

                        <div className="mt-4">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-royal-soft)]">
                            <div
                              className="h-full rounded-full bg-[var(--color-royal)]"
                              style={{ width: `${percentual}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">
                            {curso.aulasConcluidas} de {curso.totalAulas} aulas ·{" "}
                            {percentual}%
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cursos.length > 0 && (
          <aside className="mt-8 lg:mt-0 lg:w-72 lg:shrink-0">
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
              <p className="font-display text-sm font-semibold text-[var(--color-ink)]">
                Seu progresso geral
              </p>
              <div className="mt-4 flex justify-center">
                <ProgressRing percentual={percentualGeral} />
              </div>
              <p className="mt-4 text-center text-xs text-[var(--color-ink-soft)]">
                {totalConcluidas} de {totalAulas} aulas concluídas em {cursos.length}{" "}
                curso{cursos.length === 1 ? "" : "s"}
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
