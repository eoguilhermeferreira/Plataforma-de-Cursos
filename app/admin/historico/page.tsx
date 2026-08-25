import { getHistoricoCorrigidas } from "@/lib/admin-resultados";
import { HistoricoLista } from "@/components/admin/historico-lista";

export default async function AdminHistoricoPage() {
  const linhas = await getHistoricoCorrigidas();

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">
        Histórico
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Provas já corrigidas. Dá pra liberar uma nova tentativa a qualquer
        momento, mesmo pra quem já foi corrigido antes.
      </p>

      <div className="mt-6">
        <HistoricoLista linhas={linhas} />
      </div>
    </div>
  );
}
