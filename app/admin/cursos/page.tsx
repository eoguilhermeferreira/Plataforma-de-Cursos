import Link from "next/link";
import { getCursosAdmin } from "@/lib/admin-cursos";
import { getCapaUrl } from "@/lib/capas";
import { CriarCursoModal } from "@/components/admin/criar-curso-modal";

export default async function AdminCursosPage() {
  const cursos = await getCursosAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">
          Cursos
        </h1>
        <CriarCursoModal />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
        <ul className="divide-y divide-[var(--color-line)]">
          {cursos.map((curso) => (
            <li key={curso.id}>
              <Link
                href={`/admin/cursos/${curso.id}`}
                className="flex flex-col gap-2 p-4 hover:bg-[var(--color-royal-soft)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="aspect-[2/3] w-10 shrink-0 overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-royal-soft)]">
                    {getCapaUrl(curso.capa_path) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getCapaUrl(curso.capa_path)!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {curso.titulo}
                    </p>
                    {curso.descricao && (
                      <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                        {curso.descricao}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      curso.publicado
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {curso.publicado ? "Publicado" : "Rascunho"}
                  </span>
                </div>
              </Link>
            </li>
          ))}

          {cursos.length === 0 && (
            <li className="p-4 text-sm text-[var(--color-ink-soft)]">
              Nenhum curso criado ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
