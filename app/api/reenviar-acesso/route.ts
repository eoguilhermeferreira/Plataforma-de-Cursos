import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { listAllAuthUsers } from "@/lib/admin-users";
import { generateInviteToken, INVITE_TTL_MS, isValidEmail } from "@/lib/invites";
import { sendEmail } from "@/lib/email";

// A resposta é sempre a mesma, exista ou não o email — não vaza quem é
// cliente da plataforma.
const MENSAGEM_PADRAO =
  "Se este email tiver um acesso pendente, enviamos um novo link.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email && isValidEmail(email)) {
    await tentarReenviar(email);
  }

  return NextResponse.json({ message: MENSAGEM_PADRAO });
}

async function tentarReenviar(email: string) {
  const admin = createServiceRoleClient();

  const authUsers = await listAllAuthUsers(admin);
  const hasAccount = authUsers.some((u) => u.email?.toLowerCase() === email);
  if (hasAccount) {
    // Já tem conta: o caminho certo é "esqueci minha senha", não convite.
    return;
  }

  const { data: previousInvite } = await admin
    .from("invites")
    .select("course_ids, criado_por")
    .eq("email", email)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!previousInvite) {
    // Nunca foi convidado: este endpoint não cria convites novos.
    return;
  }

  await admin
    .from("invites")
    .update({ expira_em: new Date().toISOString() })
    .eq("email", email)
    .is("usado_em", null);

  const { token, tokenHash } = generateInviteToken();
  await admin.from("invites").insert({
    email,
    token_hash: tokenHash,
    course_ids: previousInvite.course_ids ?? [],
    expira_em: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    criado_por: previousInvite.criado_por,
  });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/definir-senha?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Seu acesso à plataforma",
    html: `<p>Aqui está seu novo link de acesso (válido por 24h):</p><p><a href="${link}">${link}</a></p>`,
  });
}
