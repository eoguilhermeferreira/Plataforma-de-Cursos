export const MATERIAIS_BUCKET = "materiais";

export const PDF_MAX_BYTES = 50 * 1024 * 1024;

export function originalPdfPath(lessonId: string) {
  return `original/${lessonId}.pdf`;
}

export function watermarkedPdfPath(lessonId: string, userId: string, versao: number) {
  return `watermarks/${lessonId}/${userId}-v${versao}.pdf`;
}

export function watermarkedPdfPrefix(lessonId: string) {
  return `watermarks/${lessonId}`;
}
