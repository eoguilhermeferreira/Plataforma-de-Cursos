import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/require-admin";
import { isValidEmail } from "@/lib/invites";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, isAdmin } = await getAdminUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const novoEmail =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!novoEmail || !isValidEmail(novoEmail)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    email: novoEmail,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível alterar o email. Ele já pode estar em uso." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
