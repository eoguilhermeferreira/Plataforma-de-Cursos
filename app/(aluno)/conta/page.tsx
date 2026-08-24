import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .single();

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
        Minha conta
      </h1>

      <div className="mt-6 max-w-md space-y-4">
        <div className="space-y-1 rounded-xl border border-[var(--color-line)] bg-white p-4">
          <p className="text-sm text-[var(--color-ink-soft)]">Email</p>
          <p className="text-base text-[var(--color-ink)]">{user.email}</p>
        </div>

        {profile?.nome && (
          <div className="space-y-1 rounded-xl border border-[var(--color-line)] bg-white p-4">
            <p className="text-sm text-[var(--color-ink-soft)]">Nome</p>
            <p className="text-base text-[var(--color-ink)]">{profile.nome}</p>
          </div>
        )}

        <LogoutButton className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-royal-soft)]" />
      </div>
    </div>
  );
}
