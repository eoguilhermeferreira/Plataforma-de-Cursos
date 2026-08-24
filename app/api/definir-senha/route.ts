import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { hashInviteToken } from "@/lib/invites";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }
  if (!nome) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json(
      { error: "A senha deve ter no mínimo 8 caracteres." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const tokenHash = hashInviteToken(token);

  const { data: invite } = await admin
    .from("invites")
    .select("id, email, expira_em, usado_em")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
  }
  if (invite.usado_em) {
    return NextResponse.json(
      { error: "Este convite já foi utilizado." },
      { status: 400 },
    );
  }
  if (new Date(invite.expira_em) < new Date()) {
    return NextResponse.json(
      { error: "Este convite expirou. Peça um novo acesso na tela de login." },
      { status: 400 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password: senha,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: "Não foi possível criar a conta. O email já pode estar em uso." },
      { status: 400 },
    );
  }

  await admin.from("profiles").update({ nome }).eq("id", created.user.id);

  // .is("usado_em", null) evita corrida entre dois envios simultâneos do
  // mesmo token marcando o convite como usado duas vezes.
  await admin
    .from("invites")
    .update({ usado_em: new Date().toISOString() })
    .eq("id", invite.id)
    .is("usado_em", null);

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password: senha,
  });

  if (signInError) {
    return NextResponse.json({ ok: true, autoLogin: false });
  }

  return NextResponse.json({ ok: true, autoLogin: true });
}
