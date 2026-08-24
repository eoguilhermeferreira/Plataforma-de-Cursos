// TODO: trocar pelo link real do grupo assim que o admin criar e enviar.
export const WHATSAPP_COMUNIDADE_URL = "https://chat.whatsapp.com/";

export const CONTATOS_SUPORTE = [
  { nome: "Guilherme Ferreira", telefone: "5514988044153" },
  { nome: "Rodrigo Almeida", telefone: "5514999049694" },
];

const MENSAGEM_PADRAO = "Olá! Preciso de ajuda com a plataforma.";

export function linkWhatsapp(telefone: string, mensagem: string = MENSAGEM_PADRAO) {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
