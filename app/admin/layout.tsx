import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-base font-semibold text-gray-900">Admin</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/alunos" className="text-gray-600 hover:text-gray-900">
              Alunos
            </Link>
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Sair do admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
