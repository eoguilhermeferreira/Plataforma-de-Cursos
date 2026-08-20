-- Fase 3: provas, questões, alternativas e RLS.

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  titulo text not null,
  versao int not null default 1,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'substituida')),
  tentativas_max int not null default 1,
  nota_minima numeric not null default 60,
  mostrar_gabarito boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on column public.exams.status is
  'rascunho | publicada | substituida. "substituida" é uma prova que já foi '
  'publicada, teve versão nova publicada depois dela, e fica intacta só '
  'porque tentativas antigas apontam pra ela (regra 11 do CLAUDE.md) — não '
  'está no texto original da Fase 3, que só lista rascunho/publicada, mas '
  'sem um terceiro estado não dá pra ter "só uma prova publicada por vez" '
  'e ainda manter as versões antigas legíveis ao mesmo tempo.';

create index exams_course_id_idx on public.exams (course_id);

-- Um curso só pode ter uma prova com status "publicada" (a vigente) por
-- vez. Índice único parcial: só considera linhas com status = 'publicada'.
create unique index exams_one_published_per_course
  on public.exams (course_id)
  where status = 'publicada';

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  ordem int not null default 0,
  tipo text not null check (tipo in ('objetiva', 'verdadeiro_falso', 'discursiva')),
  enunciado text not null,
  peso numeric not null default 1,
  embaralhar boolean not null default true
);

create index exam_questions_exam_id_idx on public.exam_questions (exam_id);

create table public.exam_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exam_questions (id) on delete cascade,
  ordem int not null default 0,
  texto text not null,
  correta boolean not null default false
);

create index exam_options_question_id_idx on public.exam_options (question_id);

comment on table public.exam_options is
  'O aluno nunca lê esta tabela direto (sem policy de select pra ele — só '
  'admin). "correta" não pode vazar por nenhuma query REST com a sessão do '
  'aluno. Quando a Fase 4 construir a tela de prova, as opções serão '
  'servidas por uma rota de servidor (service_role) que remove "correta" '
  'da resposta antes de devolver ao cliente.';

-- ---------------------------------------------------------------------
-- exams: RLS
-- ---------------------------------------------------------------------

alter table public.exams enable row level security;

-- Admin enxerga e gerencia tudo. Aluno só enxerga prova publicada de curso
-- em que tem matrícula ativa.
create policy "exams_select_admin_or_enrolled_published"
  on public.exams
  for select
  using (
    public.is_admin()
    or (
      status = 'publicada'
      and exists (
        select 1
        from public.enrollments e
        where e.course_id = exams.course_id
          and e.user_id = auth.uid()
          and e.status = 'ativa'
      )
    )
  );

create policy "exams_admin_insert"
  on public.exams for insert
  with check (public.is_admin());

create policy "exams_admin_update"
  on public.exams for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "exams_admin_delete"
  on public.exams for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- exam_questions: RLS
-- ---------------------------------------------------------------------

alter table public.exam_questions enable row level security;

create policy "exam_questions_select_admin_or_enrolled_published"
  on public.exam_questions
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.exams ex
      join public.enrollments en on en.course_id = ex.course_id
      where ex.id = exam_questions.exam_id
        and ex.status = 'publicada'
        and en.user_id = auth.uid()
        and en.status = 'ativa'
    )
  );

create policy "exam_questions_admin_insert"
  on public.exam_questions for insert
  with check (public.is_admin());

create policy "exam_questions_admin_update"
  on public.exam_questions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "exam_questions_admin_delete"
  on public.exam_questions for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- exam_options: RLS — SEM policy de select pra aluno, de propósito
-- ---------------------------------------------------------------------

alter table public.exam_options enable row level security;

-- Column-level grant (revogar SELECT só da coluna "correta") não funciona
-- aqui: admin e aluno autenticam com o mesmo papel do Postgres
-- (authenticated), só a checagem is_admin() dentro da policy distingue os
-- dois. Não existe forma de dar select em "texto/ordem" pro aluno e negar
-- "correta" só pra ele sem um papel de banco separado. A saída (a mesma que
-- o pedido da Fase 3 antecipou como plano B) é travar a linha inteira: o
-- aluno não lê exam_options direto em nenhuma circunstância, só por uma
-- rota de servidor que filtra o campo "correta" antes de responder.
create policy "exam_options_admin_select"
  on public.exam_options for select
  using (public.is_admin());

create policy "exam_options_admin_insert"
  on public.exam_options for insert
  with check (public.is_admin());

create policy "exam_options_admin_update"
  on public.exam_options for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "exam_options_admin_delete"
  on public.exam_options for delete
  using (public.is_admin());
