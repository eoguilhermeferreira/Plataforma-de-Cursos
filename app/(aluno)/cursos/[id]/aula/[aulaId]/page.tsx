import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeitorAula } from "@/components/aluno/leitor-aula";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ id: string; aulaId: string }>;
}) {
  const { id: cursoId, aulaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: aula } = await supabase
    .from("lessons")
    .select("id, titulo, course_id, tempo_minimo_segundos, versao")
    .eq("id", aulaId)
    .eq("course_id", cursoId)
    .maybeSingle();

  if (!aula) {
    notFound();
  }

  const { data: progresso } = await supabase
    .from("lesson_progress")
    .select("segundos_lidos, concluido_em")
    .eq("user_id", user.id)
    .eq("lesson_id", aula.id)
    .maybeSingle();

  return (
    <div className="px-4 py-6">
      <Link href={`/cursos/${cursoId}`} className="text-xs text-gray-500 underline">
        ← Voltar para o curso
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-gray-900">{aula.titulo}</h1>

      <LeitorAula
        aulaId={aula.id}
        tempoMinimoSegundos={aula.tempo_minimo_segundos}
        segundosLidosIniciais={progresso?.segundos_lidos ?? 0}
        concluidaInicialmente={Boolean(progresso?.concluido_em)}
      />
    </div>
  );
}
