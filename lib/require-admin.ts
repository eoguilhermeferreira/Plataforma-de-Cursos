import { createClient } from "@/lib/supabase/server";

/**
 * Confirma que a requisição vem de um admin autenticado. Retorna o user ou
 * null — quem chama decide o status HTTP (401 sem sessão, 403 sem papel).
 */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();

  return { user, isAdmin: profile?.papel === "admin" };
}
