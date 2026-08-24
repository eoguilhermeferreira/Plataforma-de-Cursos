import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { isValidEmail } from "@/lib/invites";

/**
 * Cria a conta do aluno na hora — admin define email e senha diretamente,
 * sem precisar gerar e enviar um link de convite. Só admin acessa esta
 * rota (regra 2 do CLAUDE.md: conta sempre criada pelo sistema, nunca por
 * cadastro público).
 */
export async function POST(request: Request) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json(
      { error: "A senha deve ter no mínimo 8 caracteres." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (error || !created.user) {
    return NextResponse.json(
      { error: "Não foi possível criar a conta. O email já pode estar em uso." },
      { status: 400 },
    );
  }

  if (nome) {
    await admin.from("profiles").update({ nome }).eq("id", created.user.id);
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}
