# CLAUDE.md — Plataforma de Estudos e Provas
Este arquivo é a memória do projeto. Toda sessão nova começa lendo ele.
Se uma regra aqui conflitar com um pedido feito no chat, pergunte antes de mudar.
---
## 1. O que é
Plataforma de cursos em PDF com prova avaliada por um humano.
O aluno lê o material (PDF), marca cada aula como concluída, e só então a prova
do curso é liberada. Ele responde a prova em formulário nativo dentro da
plataforma (múltipla escolha + questões discursivas). As objetivas são corrigidas
automaticamente por gabarito. As discursivas vão para uma fila, onde um avaliador
humano dá nota e escreve o comentário. O aluno vê o resultado em "Minhas Provas".
O primeiro conteúdo é treinamento para equipe de corretores de imóveis
(financiamento habitacional / imóvel na planta). Mais materiais virão depois.
### Acesso aos cursos (decisão revista em 2026-08-24)
Não existe mais separação de público (interno/externo) nem matrícula manual
por curso. Todo curso **publicado** aparece automaticamente para **qualquer
aluno com conta ativa**, sem o admin precisar liberar curso a curso. A conta
em si continua sendo criada só pelo sistema (convite do admin ou, na Fase 6,
webhook de pagamento) — o que mudou foi o que a conta enxerga depois de
existir: tudo que estiver publicado, não um subconjunto escolhido a dedo.
---
## 2. Vocabulário (importante)
"Corretor" é ambíguo neste projeto: significa tanto o corretor de imóveis
(que é o cliente/aluno) quanto quem corrige prova. Para evitar bug de
interpretação, no código e na UI usamos:
| Termo      | Significa                                                  |
|------------|------------------------------------------------------------|
| `admin`    | Dono da plataforma. Faz tudo.                              |
| `avaliador`| Corrige provas. Só enxerga a fila dele.                    |
| `aluno`    | Estuda e faz prova.                                        |
Nunca usar a palavra "corretor" como papel do sistema.
---
## 3. Stack
- **Next.js** (App Router, TypeScript) hospedado na **Vercel**
- **Supabase**: Postgres + Auth + Storage
- **Resend**: envio de email transacional
- **Tailwind CSS**
- **Cakto**: checkout (só na Fase 6)
Regras de stack:
- Nada de ORM pesado. `@supabase/supabase-js` direto.
- Migrations em arquivo versionado (`supabase/migrations/`), nunca SQL solto.
- RLS ligada em **todas** as tabelas. Nenhuma tabela pública.
- Chave `service_role` só em rota de servidor. Nunca no cliente.
---
## 4. Regras de negócio (não negociáveis)
### Acesso
1. **Não existe página pública de cadastro.** Em lugar nenhum, nem em teste.
2. Conta é criada pelo sistema: por convite do admin (Fase 1) ou por webhook de
   pagamento (Fase 6). O aluno só define a senha.
3. O convite é um **token aleatório**, com hash no banco, uso único, validade de
   24h. Nunca colocar email na URL.
4. O email da conta é a chave de identidade e **não pode ser alterado pelo aluno**.
   Só o admin altera.
5. Botão "Reenviar acesso" na tela de login: recebe email, e se existir convite
   ou conta pendente, gera token novo. A resposta na tela é sempre a mesma,
   tenha o email sido encontrado ou não (não vazar quem é cliente).
### Estudo
6. Progresso é honor system: botão "Marcar como concluída".
7. O botão só ativa depois de um **tempo mínimo de leitura** por aula
   (`tempo_minimo_segundos`, padrão 180). Contador pausa quando a aba perde foco.
8. O aluno pode baixar o PDF. Por isso, marca d'água é obrigatória (ver Segurança).
### Prova
9. A prova de um curso só aparece quando **todas** as aulas publicadas daquele
   curso estão concluídas. Antes disso, aba visível com cadeado e texto do que
   falta.
10. A prova é montada colando **texto** no admin. O sistema interpreta e gera o
    formulário. **Nunca publica direto**: sempre passa por tela de revisão onde
    o admin corrige enunciados, marca o tipo de cada questão e define o gabarito
    das objetivas. Só depois "Publicar".
11. Prova publicada com respostas enviadas é **imutável**. Alteração gera nova
    versão; tentativas antigas continuam apontando para a versão que responderam.
12. **Não existe campo "nome" na prova.** A identidade vem da sessão.
13. Três tipos de questão: `objetiva`, `verdadeiro_falso` e `discursiva`.
    Objetiva tem número **variável** de alternativas (4, 5 ou mais). Nunca
    assumir quatro.
14. O gabarito fica gravado na **alternativa** (`correta = true`), nunca na
    letra. As letras são atribuídas na hora de exibir.
15. **Alternativas embaralhadas a cada tentativa.** A ordem sorteada é salva na
    tentativa, para que a revisão mostre exatamente o que o aluno viu.
    Exceção: questão com `embaralhar = false` (ex.: "todas as alternativas
    anteriores") mantém a ordem original.
16. `tentativas_max` padrão **1**. A tentativa só é **consumida no envio** —
    se o aluno fechar o navegador no meio, ele volta e continua de onde parou.
17. Admin pode **liberar nova tentativa** para um aluno específico, com motivo
    registrado. É a única saída para quem reprovou.
18. `nota_minima` padrão **60%**.
19. `mostrar_gabarito` é configuração **por prova**, padrão ligado:
    - ligado: aluno vê nota, quais errou e a alternativa correta;
    - desligado: aluno vê nota e quais errou, com link para a aula, mas **não**
      a resposta certa.
20. **Nenhuma tentativa corrige sozinha (decisão revista em 2026-08-24).**
    Toda tentativa enviada vira `aguardando_correcao`, mesmo sem nenhuma
    discursiva. Objetivas e V/F são corrigidas automaticamente na hora do
    envio (`nota_objetiva`), mas isso é só sugestão pro avaliador — a gabarito
    automático pode estar errado, ou a resposta do aluno pode ter fundamento
    no material. `nota_final`/`aprovado` só existem depois que um admin
    analisa e finaliza manualmente (pode confirmar a nota sugerida ou
    ajustar). Discursivas continuam com nota e comentário manuais.
21. Enquanto não finalizada, o status é `aguardando_correcao` e o aluno vê
    "Em correção" — nunca uma nota parcial.
### Correção
16. Fila de correção: uma tentativa é atribuída a um avaliador por vez, com
    trava para dois não corrigirem a mesma.
17. Toda correção registra quem corrigiu e quando.
18. Banco de comentários reutilizáveis por questão, para o avaliador clicar em
    vez de digitar.
### Pagamento (Fase 6)
19. Só libera acesso no evento de pagamento **aprovado**. Pendente de Pix/boleto
    não libera nada.
20. Reembolso e chargeback **revogam** a matrícula (`status = revogada`), não
    apagam o registro.
21. Todo webhook recebido é gravado antes de processar, com o id externo único —
    reenvio do mesmo evento não pode criar conta duplicada nem disparar dois emails.
22. Validar a assinatura/segredo do webhook. Requisição sem assinatura válida é
    descartada com 401.
23. Tela no admin para corrigir email errado de uma compra e reenviar o acesso.
---
## 5. Segurança de conteúdo
- Bucket de PDF é **privado**. O arquivo original nunca é servido direto.
- Na primeira vez que um aluno abre uma aula, o sistema gera uma cópia com
  **marca d'água** (nome, CPF e email dele, mais data) queimada em todas as
  páginas, salva essa cópia e reusa nas próximas vezes. Não gerar a cada acesso.
- Nunca expõe URL permanente do arquivo. Download usa **signed URL curta**
  (10 minutos); a leitura embutida no leitor de PDF passa pelos bytes direto
  pela rota autenticada (sem gerar URL nenhuma), pra funcionar de forma
  confiável no leitor nativo de PDF do iOS Safari.
- Marca d'água não impede print. Ela impede repasse anônimo, que é o objetivo.
---
## 6. Versionamento de material
Conteúdo sobre financiamento envelhece e informação errada repassada ao cliente
final é risco real. Portanto:
- Toda aula tem `versao` e `atualizado_em`, exibidos na tela.
- `lesson_progress` guarda em qual versão o aluno concluiu.
- Ao publicar nova versão de uma aula, o progresso de quem já concluiu **não** é
  apagado, mas fica marcado como desatualizado no admin.
---
## 7. Modelo de dados
```
profiles          id(=auth.users), nome, cpf, telefone, papel, ativo, criado_em
courses           id, titulo, descricao, capa_path, publicado, criado_em
lessons           id, course_id, titulo, ordem, pdf_path, versao,
                  tempo_minimo_segundos, publicado, atualizado_em
enrollments       id, user_id, course_id, origem(convite|compra), status(ativa|revogada),
                  criado_em, revogado_em, motivo_revogacao
                  (tabela mantida, mas não controla mais visibilidade de curso —
                  ver "Acesso aos cursos" na seção 1; reservada para a Fase 6)
lesson_progress   id, user_id, lesson_id, segundos_lidos, concluido_em, versao_lida
invites           id, email, token_hash, course_ids[], expira_em, usado_em,
                  criado_por, criado_em
watermarked_files id, user_id, lesson_id, path, gerado_em
exams             id, course_id, titulo, versao, status(rascunho|publicada),
                  tentativas_max(default 1), nota_minima(default 60),
                  mostrar_gabarito
exam_questions    id, exam_id, ordem, tipo(objetiva|verdadeiro_falso|discursiva),
                  enunciado, peso, embaralhar(default true)
exam_options      id, question_id, ordem, texto, correta
exam_attempts     id, exam_id, exam_versao, user_id, iniciado_em, enviado_em,
                  status(em_andamento|aguardando_correcao|corrigida),
                  ordem_alternativas(jsonb), nota_objetiva, nota_final,
                  aprovado, avaliador_id, corrigido_em
attempt_grants    id, exam_id, user_id, motivo, criado_por, criado_em
exam_answers      id, attempt_id, question_id, option_id, texto_resposta,
                  correta, nota, comentario
comment_bank      id, question_id, texto, criado_por
webhook_events    id, provider, external_id(unique), evento, payload,
                  recebido_em, processado_em, erro
anotacoes         id, user_id(unique), texto, atualizado_em
```
---
## 8. UI
- **Mobile-first.** A maioria vai estudar e fazer prova pelo celular.
  Nada de tabela larga, nada de PDF em iframe minúsculo.
- Leitor de PDF precisa funcionar em iOS Safari e Android Chrome.
- Português do Brasil em toda a interface.
- Autosave da prova a cada mudança de resposta. Aluno que perde sinal no meio
  da prova não pode perder o que escreveu.
---
## 9. Fases
| Fase | Escopo                                                        | Status |
|------|---------------------------------------------------------------|--------|
| 1    | Auth, papéis, convite por email, layout protegido             | —      |
| 2    | Cursos, aulas, upload de PDF, marca d'água, leitor, progresso  | —      |
| 3    | Criação de prova: colar texto → revisão → publicar             | —      |
| 4    | Envio, correção automática, resultado                          | —      |
| 5    | "Minhas Provas" e resultados no admin                          | —      |
| 6    | Webhook Cakto, reembolso, revogação, corrigir email            | —      |
| 7    | Fila de correção com trava por avaliador e banco de comentários | adiada* |
\* Toda tentativa já passa por análise humana antes do aluno ver a nota (regra
20/21), com uma tela simples de finalizar em `/admin/correcoes` — o que falta
da Fase 7 original é a fila com **trava** pra dois avaliadores não pegarem a
mesma tentativa e o banco de comentários reutilizáveis, que só fazem sentido
quando existir mais de um avaliador ou uma prova com discursiva de verdade.
**Uma fase por sessão. Commit ao final de cada fase.** Sessão que tenta fazer
duas fases estoura o contexto no meio e deixa o código pela metade.
---
## 10. O que NÃO fazer
- Página pública de `/cadastro` ou `/signup`
- PDF preenchível para prova (AcroForm) — a prova é formulário nativo
- Campo de nome digitado na prova
- Publicar prova gerada de texto sem revisão humana
- Servir PDF original ou URL permanente de arquivo
- Liberar acesso em evento de pagamento pendente
- Apagar matrícula em reembolso (é revogação, não delete)
- Mostrar nota parcial enquanto há discursiva pendente

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
