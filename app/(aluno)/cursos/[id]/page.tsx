import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCursoDetalhe } from "@/lib/progresso";

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_CLASS: Record<string, string> = {
  nao_iniciada: "bg-gray-100 text-gray-600",
  em_andamento: "bg-blue-100 text-blue-800",
  concluida: "bg-green-100 text-green-800",
};

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dados = await getCursoDetalhe(supabase, user.id, id);
  if (!dados) {
    notFound();
  }

  const { curso, aulas } = dados;

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900">{curso.titulo}</h1>
      {curso.descricao && (
        <p className="mt-1 text-sm text-gray-500">{curso.descricao}</p>
      )}

      <ul className="mt-6 space-y-3">
        {aulas.map((aula) => (
          <li key={aula.id}>
            <Link
              href={`/cursos/${curso.id}/aula/${aula.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{aula.titulo}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Material versão {aula.versao}
                  {aula.versaoLida !== null && aula.versaoLida < aula.versao && (
                    <span className="ml-1 text-amber-600">
                      · você concluiu a v{aula.versaoLida}, atualizado
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[aula.status]}`}
              >
                {STATUS_LABEL[aula.status]}
              </span>
            </Link>
          </li>
        ))}

        {aulas.length === 0 && (
          <li className="text-sm text-gray-500">
            Nenhuma aula publicada neste curso ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
