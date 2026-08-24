import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnotacoesEditor } from "@/components/aluno/anotacoes-editor";

export default async function AnotacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: anotacao } = await supabase
    .from("anotacoes")
    .select("texto")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
        Anotações
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Salva sozinho enquanto você escreve.
      </p>

      <div className="mt-6 max-w-2xl">
        <AnotacoesEditor textoInicial={anotacao?.texto ?? ""} />
      </div>
    </div>
  );
}
