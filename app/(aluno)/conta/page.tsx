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
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900">Minha conta</h1>

      <div className="mt-6 space-y-1 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Email</p>
        <p className="text-base text-gray-900">{user.email}</p>
      </div>

      {profile?.nome && (
        <div className="mt-4 space-y-1 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Nome</p>
          <p className="text-base text-gray-900">{profile.nome}</p>
        </div>
      )}

      {profile?.papel === "admin" && (
        <a
          href="/admin"
          className="mt-4 block rounded-lg border border-gray-300 px-4 py-3 text-center text-base font-medium text-gray-900"
        >
          Ir para o painel admin
        </a>
      )}

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
