import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateInviteToken, INVITE_TTL_MS, isValidEmail } from "@/lib/invites";
import { sendEmail } from "@/lib/email";
import { getAdminUser } from "@/lib/require-admin";

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
  const courseIds = Array.isArray(body?.course_ids) ? body.course_ids : [];

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Invalida qualquer convite não usado anterior para este email, em vez
  // de deixar dois convites ativos ao mesmo tempo.
  await admin
    .from("invites")
    .update({ expira_em: new Date().toISOString() })
    .eq("email", email)
    .is("usado_em", null);

  const { token, tokenHash } = generateInviteToken();
  const expiraEm = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { error } = await admin.from("invites").insert({
    email,
    token_hash: tokenHash,
    course_ids: courseIds,
    expira_em: expiraEm,
    criado_por: user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível criar o convite." },
      { status: 500 },
    );
  }

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/definir-senha?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Seu acesso à plataforma",
    html: `<p>Você foi convidado a acessar a plataforma. Clique no link abaixo para definir sua senha (válido por 24h):</p><p><a href="${link}">${link}</a></p>`,
  });

  return NextResponse.json({ link });
}
