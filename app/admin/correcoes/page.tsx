import Link from "next/link";
import { getCorrecoesPendentes } from "@/lib/admin-resultados";

export default async function AdminCorrecoesPage() {
  const pendentes = await getCorrecoesPendentes();

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">
        Correções
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Tentativas com questão discursiva aguardando nota e comentário.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]">
        <ul className="divide-y divide-[var(--color-line)]">
          {pendentes.map((p) => (
            <li key={p.attemptId}>
              <Link
                href={`/admin/provas/${p.examId}/resultados/${p.attemptId}`}
                className="flex flex-col gap-2 p-4 hover:bg-[var(--color-royal-soft)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {p.nome || p.email}
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {p.examTitulo} · {p.cursoTitulo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                    Em correção
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(p.enviadoEm).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </Link>
            </li>
          ))}

          {pendentes.length === 0 && (
            <li className="p-4 text-sm text-[var(--color-ink-soft)]">
              Nenhuma correção pendente.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
