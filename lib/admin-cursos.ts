import { createClient } from "@/lib/supabase/server";

export async function getCursosAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, titulo, descricao, publicado, criado_em")
    .order("criado_em", { ascending: false });

  return data ?? [];
}

export async function getCursoAdmin(id: string) {
  const supabase = await createClient();
  const { data: curso } = await supabase
    .from("courses")
    .select("id, titulo, descricao, publicado, criado_em")
    .eq("id", id)
    .maybeSingle();

  if (!curso) return null;

  const { data: aulas } = await supabase
    .from("lessons")
    .select(
      "id, titulo, ordem, versao, tempo_minimo_segundos, publicado, atualizado_em",
    )
    .eq("course_id", id)
    .order("ordem", { ascending: true });

  return { curso, aulas: aulas ?? [] };
}
