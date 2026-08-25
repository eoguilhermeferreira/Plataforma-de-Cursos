import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlunoShell } from "@/components/aluno/aluno-shell";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("papel, nome")
      .eq("id", user.id)
      .single();

    // Conta de admin não passa pela área do aluno em nenhuma tela — cai
    // direto no painel administrativo, inclusive logo após o login.
    if (profile?.papel === "admin") {
      redirect("/admin");
    }

    nome = profile?.nome ?? null;
  }

  return (
    <AlunoShell nome={nome} email={user?.email ?? null}>
      {children}
    </AlunoShell>
  );
}
