export type TipoQuestao = "objetiva" | "verdadeiro_falso" | "discursiva";

export type OpcaoImportada = {
  texto: string;
  correta: boolean;
};

export type QuestaoImportada = {
  ordem: number;
  tipo: TipoQuestao;
  enunciado: string;
  opcoes: OpcaoImportada[];
  embaralhar: boolean;
  gabaritoEncontrado: boolean;
};

const REGEX_CABECALHO = /^\s*(nome|data)\s*:.*$/gim;
const REGEX_SEPARADOR = /^\s*-{3,}\s*$/gim;
const REGEX_GABARITO_TITULO = /^\s*gabarito\s*:?\s*$/im;
const REGEX_INICIO_QUESTAO = /^\s*(\d+)\.\s+/gm;
const REGEX_ALTERNATIVA = /^\s*([A-Z])\)\s*(.*)$/gm;
const REGEX_VF_MARCADOR = /\(\s*\)\s*(verdadeiro|falso)/gi;
const REGEX_LINHA_GABARITO = /^\s*(\d+)[.):]\s*(.+?)\s*$/gm;

const EXPRESSOES_NAO_EMBARALHAR = [
  "todas as alternativas",
  "todas as anteriores",
  "nenhuma das anteriores",
  "nenhuma das alternativas",
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function deveDesligarEmbaralhar(opcoes: OpcaoImportada[]): boolean {
  return opcoes.some((opcao) => {
    const normalizado = normalizar(opcao.texto);
    return EXPRESSOES_NAO_EMBARALHAR.some((expressao) => normalizado.includes(expressao));
  });
}

/**
 * Recebe o texto colado pelo admin (prova + gabarito) e devolve as questões
 * já interpretadas: tipo, enunciado, alternativas (quantidade variável) e a
 * correta marcada quando o gabarito trouxer resposta pra ela. Não publica
 * nada — é só a matéria-prima pra tela de revisão (regra 10 do CLAUDE.md).
 */
export function parseProvaTexto(textoOriginal: string): QuestaoImportada[] {
  const matchGabarito = REGEX_GABARITO_TITULO.exec(textoOriginal);
  const corpo = matchGabarito
    ? textoOriginal.slice(0, matchGabarito.index)
    : textoOriginal;
  const textoGabarito = matchGabarito
    ? textoOriginal.slice(matchGabarito.index + matchGabarito[0].length)
    : "";

  const corpoLimpo = corpo
    .replace(REGEX_CABECALHO, "")
    .replace(REGEX_SEPARADOR, "");

  const gabarito = parseGabarito(textoGabarito);
  const blocos = dividirEmBlocos(corpoLimpo);

  return blocos.map(({ numero, texto }, index) => {
    const questao = interpretarBloco(texto);
    const resposta = gabarito.get(numero);
    const gabaritoEncontrado = aplicarGabarito(questao, resposta);

    return {
      ordem: index,
      tipo: questao.tipo,
      enunciado: questao.enunciado,
      opcoes: questao.opcoes,
      embaralhar: questao.tipo === "objetiva" ? !deveDesligarEmbaralhar(questao.opcoes) : true,
      gabaritoEncontrado,
    };
  });
}

function dividirEmBlocos(corpo: string): { numero: number; texto: string }[] {
  const indices: { numero: number; inicio: number }[] = [];
  REGEX_INICIO_QUESTAO.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REGEX_INICIO_QUESTAO.exec(corpo)) !== null) {
    indices.push({ numero: Number(match[1]), inicio: match.index });
  }

  return indices.map((atual, i) => {
    const fim = i + 1 < indices.length ? indices[i + 1].inicio : corpo.length;
    const bruto = corpo.slice(atual.inicio, fim);
    const semNumero = bruto.replace(/^\s*\d+\.\s+/, "");
    return { numero: atual.numero, texto: semNumero.trim() };
  });
}

function interpretarBloco(texto: string): {
  tipo: TipoQuestao;
  enunciado: string;
  opcoes: OpcaoImportada[];
} {
  REGEX_VF_MARCADOR.lastIndex = 0;
  const primeiroVf = REGEX_VF_MARCADOR.exec(texto);
  if (primeiroVf) {
    const enunciado = texto.slice(0, primeiroVf.index).trim();
    return {
      tipo: "verdadeiro_falso",
      enunciado,
      opcoes: [
        { texto: "Verdadeiro", correta: false },
        { texto: "Falso", correta: false },
      ],
    };
  }

  REGEX_ALTERNATIVA.lastIndex = 0;
  const linhas = texto.split("\n");
  let indiceAlternativas = -1;
  const opcoes: OpcaoImportada[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const linhaMatch = /^\s*([A-Z])\)\s*(.*)$/.exec(linhas[i]);
    if (linhaMatch) {
      if (indiceAlternativas === -1) indiceAlternativas = i;
      opcoes.push({ texto: linhaMatch[2].trim(), correta: false });
    }
  }

  if (opcoes.length > 0) {
    const enunciado = linhas.slice(0, indiceAlternativas).join("\n").trim();
    return { tipo: "objetiva", enunciado, opcoes };
  }

  return { tipo: "discursiva", enunciado: texto.trim(), opcoes: [] };
}

function parseGabarito(texto: string): Map<number, string> {
  const respostas = new Map<number, string>();
  REGEX_LINHA_GABARITO.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REGEX_LINHA_GABARITO.exec(texto)) !== null) {
    const numero = Number(match[1]);
    const resposta = match[2].trim();
    if (resposta) respostas.set(numero, resposta);
  }
  return respostas;
}

function aplicarGabarito(
  questao: { tipo: TipoQuestao; opcoes: OpcaoImportada[] },
  resposta: string | undefined,
): boolean {
  if (!resposta) return false;

  if (questao.tipo === "objetiva") {
    const letra = resposta.trim().toUpperCase().charAt(0);
    const indice = letra.charCodeAt(0) - "A".charCodeAt(0);
    if (indice < 0 || indice >= questao.opcoes.length) return false;
    questao.opcoes[indice].correta = true;
    return true;
  }

  if (questao.tipo === "verdadeiro_falso") {
    const normalizado = normalizar(resposta);
    const ehVerdadeiro = normalizado.startsWith("v");
    const ehFalso = normalizado.startsWith("f");
    if (!ehVerdadeiro && !ehFalso) return false;

    const alvo = ehVerdadeiro ? "verdadeiro" : "falso";
    const opcao = questao.opcoes.find((o) => normalizar(o.texto) === alvo);
    if (opcao) opcao.correta = true;
    return true;
  }

  return false;
}
