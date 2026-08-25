import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export type WatermarkInfo = {
  nome: string;
  cpf: string | null;
  email: string;
  data: string;
};

const MARCA_PLATAFORMA =
  "Conteúdo restrito · Guilherme Henrique Ferreira e Rodrigo Almeida";

/**
 * Queima uma marca d'água diagonal, em opacidade baixa, repetida em toda a
 * página (não impede leitura nem print — impede só o repasse anônimo do
 * arquivo, que é o objetivo real). Duas linhas por marca: a de cima é o
 * texto fixo da plataforma, bem legível; a de baixo, menor, traz os dados
 * do aluno (nome, CPF, email, data) — é o que permite rastrear de qual
 * conta saiu um PDF vazado.
 */
export async function applyWatermark(
  pdfBytes: Uint8Array,
  info: WatermarkInfo,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const fontPrincipal = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontAluno = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const linhaAluno = `${info.nome} · ${info.cpf ?? "CPF não cadastrado"} · ${info.email} · ${info.data}`;

  const tamanhoPrincipal = 13;
  const tamanhoAluno = 9;

  const larguraPrincipal = fontPrincipal.widthOfTextAtSize(
    MARCA_PLATAFORMA,
    tamanhoPrincipal,
  );
  const larguraAluno = fontAluno.widthOfTextAtSize(linhaAluno, tamanhoAluno);
  const stepX = Math.max(larguraPrincipal, larguraAluno) + 80;
  const stepY = 140;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();

    for (let y = -height; y < height * 1.5; y += stepY) {
      for (let x = -width * 0.5; x < width * 1.5; x += stepX) {
        page.drawText(MARCA_PLATAFORMA, {
          x,
          y: y + 9,
          size: tamanhoPrincipal,
          font: fontPrincipal,
          color: rgb(0.45, 0.45, 0.52),
          opacity: 0.24,
          rotate: degrees(45),
        });
        page.drawText(linhaAluno, {
          x,
          y: y - 9,
          size: tamanhoAluno,
          font: fontAluno,
          color: rgb(0.55, 0.55, 0.55),
          opacity: 0.14,
          rotate: degrees(45),
        });
      }
    }
  }

  return pdfDoc.save();
}
