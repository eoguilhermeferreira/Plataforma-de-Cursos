import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconCursos, IconAlunos, IconCorrecao, IconLivro, IconSair } from "@/components/icons";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();

  if (profile?.papel !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--color-royal-soft)]">
      <header className="bg-[var(--color-royal-deep)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-royal)] text-white">
              <IconLivro className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-semibold text-white">
              Painel administrativo
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/admin/cursos"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#B9C2F0] hover:bg-white/10 hover:text-white"
            >
              <IconCursos className="h-4 w-4" />
              <span className="hidden sm:inline">Cursos</span>
            </Link>
            <Link
              href="/admin/alunos"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#B9C2F0] hover:bg-white/10 hover:text-white"
            >
              <IconAlunos className="h-4 w-4" />
              <span className="hidden sm:inline">Alunos</span>
            </Link>
            <Link
              href="/admin/correcoes"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#B9C2F0] hover:bg-white/10 hover:text-white"
            >
              <IconCorrecao className="h-4 w-4" />
              <span className="hidden sm:inline">Correções</span>
            </Link>
            <ThemeToggle className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-[#B9C2F0] hover:bg-white/10 hover:text-white" />
            <LogoutButton
              icon={<IconSair className="h-4 w-4" />}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
