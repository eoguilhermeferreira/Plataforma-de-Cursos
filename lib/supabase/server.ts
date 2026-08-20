import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Server
 * Actions. Usa a chave anônima — respeita RLS pela sessão do cookie.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component sem permissão de escrita.
            // O middleware cuida de renovar a sessão nesse caso.
          }
        },
      },
    },
  );
}

/**
 * Cliente com service_role. Ignora RLS — só pode ser usado em rotas de
 * servidor (Route Handlers), nunca exposto ao cliente.
 */
export function createServiceRoleClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Cliente service_role não gerencia sessão via cookie.
        },
      },
    },
  );
}
