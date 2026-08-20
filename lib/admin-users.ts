import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type AlunoRow = {
  userId: string | null;
  email: string;
  nome: string | null;
  papel: string | null;
  ativo: boolean | null;
  criadoEm: string;
  status: "aceito" | "pendente" | "expirado";
};

/**
 * Lista combinada de contas já criadas + convites ainda não aceitos, para a
 * tela /admin/alunos. Usa service_role — só pode rodar em contexto de
 * servidor já validado como admin.
 */
export async function getAlunosList(): Promise<AlunoRow[]> {
  const admin = createServiceRoleClient();

  const [{ data: invites }, authUsers, { data: profiles }] =
    await Promise.all([
      admin
        .from("invites")
        .select("email, expira_em, usado_em, criado_em")
        .order("criado_em", { ascending: false }),
      listAllAuthUsers(admin),
      admin.from("profiles").select("id, nome, papel, ativo, criado_em"),
    ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const userByEmail = new Map(
    authUsers.map((u) => [u.email?.toLowerCase() ?? "", u]),
  );

  const latestInviteByEmail = new Map<
    string,
    { expira_em: string; usado_em: string | null; criado_em: string }
  >();
  for (const invite of invites ?? []) {
    const key = invite.email.toLowerCase();
    if (!latestInviteByEmail.has(key)) {
      latestInviteByEmail.set(key, invite);
    }
  }

  const rows: AlunoRow[] = [];
  const seen = new Set<string>();

  for (const [email, invite] of latestInviteByEmail) {
    seen.add(email);
    const authUser = userByEmail.get(email);
    const profile = authUser ? profileById.get(authUser.id) : undefined;

    let status: AlunoRow["status"];
    if (authUser) {
      status = "aceito";
    } else if (new Date(invite.expira_em) < new Date()) {
      status = "expirado";
    } else {
      status = "pendente";
    }

    rows.push({
      userId: authUser?.id ?? null,
      email,
      nome: profile?.nome ?? null,
      papel: profile?.papel ?? null,
      ativo: profile?.ativo ?? null,
      criadoEm: invite.criado_em,
      status,
    });
  }

  // Usuários que existem mas, por algum motivo, não têm invite (ex.: criado
  // fora do fluxo padrão) ainda aparecem na lista como "aceito".
  for (const authUser of authUsers) {
    const email = authUser.email?.toLowerCase() ?? "";
    if (!email || seen.has(email)) continue;
    const profile = profileById.get(authUser.id);
    rows.push({
      userId: authUser.id,
      email,
      nome: profile?.nome ?? null,
      papel: profile?.papel ?? null,
      ativo: profile?.ativo ?? null,
      criadoEm: authUser.created_at,
      status: "aceito",
    });
  }

  rows.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  return rows;
}

export async function listAllAuthUsers(
  admin: ReturnType<typeof createServiceRoleClient>,
) {
  const perPage = 200;
  let page = 1;
  const all: User[] = [];

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return all;
}
