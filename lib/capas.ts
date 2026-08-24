export const CAPAS_BUCKET = "capas";

export const CAPA_MAX_BYTES = 5 * 1024 * 1024;

export const CAPA_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Proporção recomendada da capa — retrato, igual a uma capa de livro real. */
export const CAPA_LARGURA_RECOMENDADA = 1000;
export const CAPA_ALTURA_RECOMENDADA = 1500;

export function novoCapaPath(courseId: string, mimeType: string) {
  const ext = CAPA_MIME_EXT[mimeType] ?? "jpg";
  return `${courseId}/${crypto.randomUUID()}.${ext}`;
}

export function getCapaUrl(capaPath: string | null): string | null {
  if (!capaPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${CAPAS_BUCKET}/${capaPath}`;
}
