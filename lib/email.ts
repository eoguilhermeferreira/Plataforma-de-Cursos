/**
 * Envio de email isolado nesta função para trocar por Resend depois sem
 * tocar em quem chama. Por enquanto só registra no console — nenhum email
 * é enviado de verdade.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  console.log("[email] (envio simulado, Resend ainda não integrado)");
  console.log(`  para: ${params.to}`);
  console.log(`  assunto: ${params.subject}`);
  console.log(`  corpo:\n${params.html}`);
}
