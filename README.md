# Plataforma de Estudos e Provas

Ver `CLAUDE.md` para a especificação completa do produto.

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [Supabase](https://supabase.com) e rode as migrations
   em `supabase/migrations/` (via Supabase CLI ou colando o SQL no editor
   do painel, em ordem).

3. Copie `.env.example` para `.env.local` e preencha as variáveis:

   ```bash
   cp .env.example .env.local
   ```

4. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

5. Acesse `http://localhost:3000`.

### Convites (Fase 1)

O envio de email ainda não está integrado com o Resend. Ao criar um convite
em `/admin/alunos`, o link de acesso aparece na própria tela do admin, com
um botão "Copiar link". O conteúdo do email fica registrado no terminal do
servidor (`lib/email.ts`).

Para criar o primeiro admin, convide um usuário normalmente e depois
atualize o campo `papel` dele para `admin` direto no banco (Supabase Studio
ou SQL), já que não existe cadastro público nem promoção via UI nesta fase.
