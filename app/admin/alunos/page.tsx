import { getAlunosList } from "@/lib/admin-users";
import { ConvidarAlunoModal } from "@/components/admin/convidar-aluno-modal";
import { CriarContaModal } from "@/components/admin/criar-conta-modal";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">
          Alunos
        </h1>
        <div className="flex flex-wrap gap-2">
          <CriarContaModal />
          <ConvidarAlunoModal />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]">
        <ul className="divide-y divide-[var(--color-line)]">
          {alunos.map((aluno) => (
            <li
              key={aluno.email}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {aluno.nome || aluno.email}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">{aluno.email}</p>
                {aluno.papel && (
                  <p className="text-xs text-gray-400">
                    {aluno.papel}
                    {aluno.ativo === false ? " · inativo" : ""}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
            <li className="p-4 text-sm text-[var(--color-ink-soft)]">
              Nenhum aluno convidado ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
