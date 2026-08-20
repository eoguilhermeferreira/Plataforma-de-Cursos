import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export type WatermarkInfo = {
  nome: string;
  cpf: string | null;
  email: string;
  data: string;
};

/**
 * Queima uma marca d'água diagonal, em opacidade baixa, repetida em toda a
 * página (não impede leitura nem print — impede só o repasse anônimo do
 * arquivo, que é o objetivo real).
 */
export async function applyWatermark(
  pdfBytes: Uint8Array,
  info: WatermarkInfo,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const linha = `${info.nome} · ${info.cpf ?? "CPF não cadastrado"} · ${info.email} · ${info.data}`;
  const fontSize = 12;
  const textWidth = font.widthOfTextAtSize(linha, fontSize);
  const stepX = textWidth + 80;
  const stepY = 130;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();

    for (let y = -height; y < height * 1.5; y += stepY) {
      for (let x = -width * 0.5; x < width * 1.5; x += stepX) {
        page.drawText(linha, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.55, 0.55, 0.55),
          opacity: 0.16,
          rotate: degrees(45),
        });
      }
    }
  }

  return pdfDoc.save();
}
