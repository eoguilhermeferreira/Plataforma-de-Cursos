import { describe, expect, it } from "vitest";
import { parseProvaTexto } from "./prova-parser";

const PROVA_REAL = `Nome: ___________________________________
Data: ___/___/______

1. O que é o Custo Efetivo Total (CET) de um financiamento?
A) Apenas a taxa de juros nominal do contrato
B) O custo total do financiamento, incluindo juros, tarifas, seguros e impostos
C) O valor da entrada exigida pelo banco
D) O valor de avaliação do imóvel
---
2. Qual sistema de amortização tem parcelas decrescentes ao longo do tempo?
A) SAC (Sistema de Amortização Constante)
B) Price
C) SACRE
D) Nenhum dos sistemas usados no Brasil
---
3. O que é o FGTS na compra de imóvel residencial?
A) Um seguro obrigatório do financiamento
B) Uma taxa cobrada pelo cartório
C) Um recurso que pode ser usado como parte do pagamento ou amortização
D) Um imposto municipal sobre a transferência do imóvel
---
4. O que é a matrícula do imóvel?
A) O comprovante de pagamento do IPTU
B) O documento que registra o histórico e a situação jurídica do imóvel
C) O contrato de compra e venda
D) A certidão de nascimento do proprietário
---
5. Em um imóvel na planta, o que é o "habite-se"?
A) A autorização municipal que atesta que a obra está pronta para uso
B) O contrato assinado com a construtora
C) O boletim de pagamento mensal das parcelas
D) A escritura definitiva do imóvel
---
6. O que caracteriza o regime de patrimônio de afetação em uma incorporação?
A) Junta o patrimônio da construtora com o de todas as obras em um só caixa
B) Separa o patrimônio da obra do patrimônio geral da incorporadora
C) Elimina a necessidade de registro da incorporação
D) É exigido apenas para imóveis comerciais
---
7. O que é a Taxa Referencial (TR) em contratos mais antigos de financiamento?
A) Um índice fixo de 1% ao mês
B) Uma taxa cobrada só no ato da assinatura
C) Um índice usado para corrigir o saldo devedor
D) O valor do seguro obrigatório
---
8. Qual documento comprova que não há dívidas de IPTU sobre o imóvel?
A) Certidão negativa de débitos municipais
B) Certidão de matrícula atualizada
C) Contrato social da construtora
D) Certidão de nascimento
---
9. O que é a análise de crédito feita pelo banco antes de aprovar o financiamento?
A) Uma vistoria física obrigatória do imóvel
B) A avaliação da capacidade de pagamento e histórico do comprador
C) Um exame jurídico do vendedor apenas
D) Uma etapa opcional, dispensável a pedido do cliente
---
10. O comprador de imóvel na planta assume o risco de a obra nunca ser concluída, mesmo com o patrimônio de afetação.
(   ) Verdadeiro
(   ) Falso
---
11. O que é a amortização extraordinária de um financiamento?
A) O pagamento de parcela em atraso
B) O pagamento de valor adicional para reduzir prazo ou parcela
C) O cancelamento do contrato
D) A troca de instituição financeira
---
12. Qual a função do seguro MIP em um financiamento habitacional?
A) Cobrir o saldo devedor em caso de morte ou invalidez do mutuário
B) Cobrir danos ao imóvel por incêndio
C) Garantir a entrega da obra no prazo
D) Substituir a necessidade de fiador
---
13. O que é o DFI em um contrato de financiamento imobiliário?
A) Um documento fiscal da construtora
B) O seguro contra danos físicos ao imóvel
C) A taxa de abertura de crédito
D) O comprovante de residência do comprador
---
14. Assinale a alternativa que descreve corretamente o que compõe o CET.
A) Somente a taxa de juros
B) Somente as tarifas bancárias
C) Somente o seguro obrigatório
D) Somente o valor do IOF
E) Todas as alternativas anteriores, somadas
---
15. O que é a tabela Price?
A) Um sistema de amortização com parcelas fixas
B) Um índice de correção monetária
C) Um tipo de seguro habitacional
D) Um documento cartorial
---
16. O que é a averbação da construção na matrícula do imóvel?
A) O registro que formaliza a conclusão da obra no imóvel
B) O pagamento do ITBI
C) A assinatura do contrato de financiamento
D) A vistoria de entrega das chaves
---
17. Recursos do FGTS podem ser usados para financiar qualquer tipo de imóvel, inclusive comercial, sem restrição de valor.
(   ) Verdadeiro
(   ) Falso
---
18. O que é o ITBI?
A) Um imposto federal sobre a renda do vendedor
B) Uma taxa cobrada pelo banco na liberação do crédito
C) Um imposto municipal sobre a transmissão do imóvel
D) Uma tarifa de cartório para emissão de certidão
---
19. O que é a Cédula de Crédito Imobiliário (CCI)?
A) Um título que representa o crédito do financiamento e pode ser negociado
B) Um tipo de seguro obrigatório
C) Um documento pessoal do comprador
D) Um certificado de conclusão de obra
---
20. O que é a portabilidade de crédito imobiliário?
A) A possibilidade de transferir o financiamento para outra instituição
B) A venda do imóvel ainda financiado
C) A troca do sistema de amortização sem trocar de banco
D) O cancelamento do seguro obrigatório

GABARITO
1. B
2. A
3. C
4. B
5. A
6. B
7. C
8. A
9. B
10. Falso
11. B
12. A
13. B
14. E
15. A
16. A
17. Falso
18. C
19. A
20. A
`;

describe("parseProvaTexto", () => {
  const questoes = parseProvaTexto(PROVA_REAL);

  it("gera exatamente 20 questões", () => {
    expect(questoes).toHaveLength(20);
  });

  it("não transforma o cabeçalho (Nome/Data) em questão", () => {
    const contemCabecalho = questoes.some(
      (q) =>
        q.enunciado.toLowerCase().includes("nome:") ||
        q.enunciado.toLowerCase().includes("data:"),
    );
    expect(contemCabecalho).toBe(false);
  });

  it("classifica 18 objetivas e 2 verdadeiro/falso", () => {
    const objetivas = questoes.filter((q) => q.tipo === "objetiva");
    const vf = questoes.filter((q) => q.tipo === "verdadeiro_falso");
    expect(objetivas).toHaveLength(18);
    expect(vf).toHaveLength(2);
  });

  it("a questão 14 (índice 13) vem com 5 alternativas e embaralhar desligado", () => {
    const questao14 = questoes[13];
    expect(questao14.tipo).toBe("objetiva");
    expect(questao14.opcoes).toHaveLength(5);
    expect(questao14.embaralhar).toBe(false);
    expect(questao14.opcoes[4].correta).toBe(true);
  });

  it("as questões 10 e 17 são verdadeiro/falso com Falso marcado como correto", () => {
    const questao10 = questoes[9];
    const questao17 = questoes[16];

    for (const questao of [questao10, questao17]) {
      expect(questao.tipo).toBe("verdadeiro_falso");
      const falso = questao.opcoes.find((o) => o.texto === "Falso");
      const verdadeiro = questao.opcoes.find((o) => o.texto === "Verdadeiro");
      expect(falso?.correta).toBe(true);
      expect(verdadeiro?.correta).toBe(false);
    }
  });

  it("aplica o gabarito nas objetivas comuns (ex.: questão 1 = B)", () => {
    const questao1 = questoes[0];
    const correta = questao1.opcoes.find((o) => o.correta);
    expect(correta?.texto).toContain("O custo total do financiamento");
  });

  it("todas as questões têm o gabarito marcado", () => {
    expect(questoes.every((q) => q.gabaritoEncontrado)).toBe(true);
  });

  it("mantém embaralhar ligado nas objetivas sem 'todas/nenhuma das anteriores'", () => {
    const questao1 = questoes[0];
    expect(questao1.embaralhar).toBe(true);
  });
});

describe("parseProvaTexto sem gabarito no texto", () => {
  const textoSemGabarito = `1. Pergunta sem gabarito
A) primeira
B) segunda
C) terceira
---
2. Segunda pergunta sem gabarito
A) primeira
B) segunda
`;

  it("importa mesmo assim, sem nenhuma alternativa marcada como correta", () => {
    const questoes = parseProvaTexto(textoSemGabarito);
    expect(questoes).toHaveLength(2);
    for (const questao of questoes) {
      expect(questao.gabaritoEncontrado).toBe(false);
      expect(questao.opcoes.every((o) => !o.correta)).toBe(true);
    }
  });
});

describe("parseProvaTexto com discursiva", () => {
  const texto = `1. Explique com suas palavras o que é o CET e por que ele é mais representativo que a taxa de juros nominal.
---
2. Alternativa objetiva de controle
A) sim
B) não

GABARITO
2. A
`;

  it("questão sem alternativas nem marcador V/F vira discursiva", () => {
    const questoes = parseProvaTexto(texto);
    expect(questoes[0].tipo).toBe("discursiva");
    expect(questoes[0].opcoes).toHaveLength(0);
    expect(questoes[0].gabaritoEncontrado).toBe(false);
  });
});
