import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getResultadosDaProva, gerarCsvResultados } from "@/lib/admin-resultados";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, isAdmin } = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id: examId } = await params;
  const linhas = await getResultadosDaProva(examId);
  const csv = gerarCsvResultados(linhas);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resultados-${examId}.csv"`,
    },
  });
}
