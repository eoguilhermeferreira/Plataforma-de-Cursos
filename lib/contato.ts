export const WHATSAPP_COMUNIDADE_URL =
  "https://chat.whatsapp.com/BZo3jn9LWcH3POQTJxIpeG?s=hd&p=i&mlu=4";

export const COMUNIDADE_NOME = "Comunidade da Plataforma";

// Caminho no bucket público "capas" — some quando a foto do grupo for enviada.
export const COMUNIDADE_FOTO_PATH = "comunidade/foto.jpg";

export const CONTATOS_SUPORTE = [
  { nome: "Guilherme Ferreira", telefone: "5514988044153" },
  { nome: "Rodrigo Almeida", telefone: "5514999049694" },
];

const MENSAGEM_PADRAO = "Olá! Preciso de ajuda com a plataforma.";

export function linkWhatsapp(telefone: string, mensagem: string = MENSAGEM_PADRAO) {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
