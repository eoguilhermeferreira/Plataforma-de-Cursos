import { getAlunosList } from "@/lib/admin-users";
import { ConvidarAlunoModal } from "@/components/admin/convidar-aluno-modal";
import { ReenviarConviteButton } from "@/components/admin/reenviar-convite-button";
import { AlterarEmailButton } from "@/components/admin/alterar-email-button";

const STATUS_LABEL: Record<string, string> = {
  aceito: "Aceito",
  pendente: "Pendente",
  expirado: "Expirado",
};

const STATUS_CLASS: Record<string, string> = {
  aceito: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  expirado: "bg-red-100 text-red-800",
};

export default async function AlunosPage() {
  const alunos = await getAlunosList();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Alunos</h1>
        <ConvidarAlunoModal />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-200">
          {alunos.map((aluno) => (
            <li
              key={aluno.email}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {aluno.nome || aluno.email}
                </p>
                <p className="text-xs text-gray-500">{aluno.email}</p>
                {aluno.papel && (
                  <p className="text-xs text-gray-400">
                    {aluno.papel}
                    {aluno.ativo === false ? " · inativo" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[aluno.status]}`}
                >
                  {STATUS_LABEL[aluno.status]}
                </span>

                {aluno.status !== "aceito" && (
                  <ReenviarConviteButton email={aluno.email} />
                )}
                {aluno.userId && (
                  <AlterarEmailButton
                    userId={aluno.userId}
                    emailAtual={aluno.email}
                  />
                )}
              </div>
            </li>
          ))}

          {alunos.length === 0 && (
            <li className="p-4 text-sm text-gray-500">
              Nenhum aluno convidado ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
