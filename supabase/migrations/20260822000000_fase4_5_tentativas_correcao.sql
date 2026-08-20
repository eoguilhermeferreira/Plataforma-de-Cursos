-- Fases 4 e 5: tentativas de prova, correção automática e liberação de
-- nova tentativa.

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  exam_versao int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  enviado_em timestamptz,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'aguardando_correcao', 'corrigida')),
  ordem_alternativas jsonb not null default '{}'::jsonb,
  nota_objetiva numeric,
  nota_final numeric,
  aprovado boolean,
  avaliador_id uuid references public.profiles (id),
  corrigido_em timestamptz
);

comment on column public.exam_attempts.ordem_alternativas is
  'jsonb {questionId: [optionId em ordem exibida, ...]}. Só entra aqui '
  'questão com embaralhar = true; a ausência da chave = usa a ordem natural '
  '(exam_options.ordem). Sorteada uma vez ao iniciar, reusada em toda '
  'exibição/revisão dessa tentativa.';

create index exam_attempts_exam_id_idx on public.exam_attempts (exam_id);
create index exam_attempts_user_id_idx on public.exam_attempts (user_id);

-- No máximo uma tentativa "em_andamento" por aluno/prova ao mesmo tempo —
-- evita corrida de duplo clique em "iniciar" criando duas tentativas soltas.
create unique index exam_attempts_uma_em_andamento_por_aluno
  on public.exam_attempts (exam_id, user_id)
  where status = 'em_andamento';

create table public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id uuid not null references public.exam_questions (id) on delete cascade,
  option_id uuid references public.exam_options (id),
  texto_resposta text,
  correta boolean,
  nota numeric,
  comentario text,
  unique (attempt_id, question_id)
);

create index exam_answers_attempt_id_idx on public.exam_answers (attempt_id);

create table public.attempt_grants (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  motivo text not null,
  criado_por uuid references public.profiles (id),
  criado_em timestamptz not null default now()
);

create index attempt_grants_exam_user_idx on public.attempt_grants (exam_id, user_id);

-- ---------------------------------------------------------------------
-- exam_attempts: trigger de início — valida no banco o que a rota de
-- servidor também valida, pra ninguém conseguir criar uma tentativa
-- inserindo direto via REST com a sessão do aluno (regra: "nunca no
-- cliente", igual ao tempo mínimo de leitura na Fase 2).
-- ---------------------------------------------------------------------

create or replace function public.enforce_exam_attempt_start_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_tentativas_max int;
  v_total_aulas_publicadas int;
  v_aulas_concluidas int;
  v_tentativas_usadas int;
  v_grants int;
begin
  if public.is_admin() then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Só é possível iniciar tentativa em nome do próprio usuário.';
  end if;

  select course_id, tentativas_max into v_course_id, v_tentativas_max
  from public.exams
  where id = new.exam_id and status = 'publicada';

  if v_course_id is null then
    raise exception 'Prova não encontrada ou não publicada.';
  end if;

  if not exists (
    select 1 from public.enrollments
    where course_id = v_course_id and user_id = new.user_id and status = 'ativa'
  ) then
    raise exception 'Matrícula ativa é necessária para iniciar a prova.';
  end if;

  select count(*) into v_total_aulas_publicadas
  from public.lessons
  where course_id = v_course_id and publicado = true;

  select count(*) into v_aulas_concluidas
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  where lp.user_id = new.user_id
    and l.course_id = v_course_id
    and l.publicado = true
    and lp.concluido_em is not null;

  if v_total_aulas_publicadas = 0 or v_aulas_concluidas < v_total_aulas_publicadas then
    raise exception 'É preciso concluir todas as aulas antes de iniciar a prova.';
  end if;

  select count(*) into v_tentativas_usadas
  from public.exam_attempts
  where exam_id = new.exam_id
    and user_id = new.user_id
    and enviado_em is not null;

  select count(*) into v_grants
  from public.attempt_grants
  where exam_id = new.exam_id and user_id = new.user_id;

  if v_tentativas_usadas >= v_tentativas_max + v_grants then
    raise exception 'Não há tentativas disponíveis para esta prova. Fale com o administrador.';
  end if;

  return new;
end;
$$;

create trigger exam_attempts_before_insert_validate
  before insert on public.exam_attempts
  for each row
  execute function public.enforce_exam_attempt_start_rules();

-- ---------------------------------------------------------------------
-- exam_attempts: trava de campos — nota/status/correção só podem vir da
-- correção automática (rota de servidor com service_role) ou de admin.
-- ---------------------------------------------------------------------

create or replace function public.enforce_exam_attempt_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.nota_objetiva is distinct from old.nota_objetiva
    or new.nota_final is distinct from old.nota_final
    or new.aprovado is distinct from old.aprovado
    or new.avaliador_id is distinct from old.avaliador_id
    or new.corrigido_em is distinct from old.corrigido_em
    or new.enviado_em is distinct from old.enviado_em
    or new.exam_id is distinct from old.exam_id
    or new.exam_versao is distinct from old.exam_versao
    or new.user_id is distinct from old.user_id
    or new.ordem_alternativas is distinct from old.ordem_alternativas
  then
    raise exception 'Este campo só pode ser alterado pelo servidor.';
  end if;

  return new;
end;
$$;

create trigger exam_attempts_before_update_lock_fields
  before update on public.exam_attempts
  for each row
  execute function public.enforce_exam_attempt_write_rules();

-- ---------------------------------------------------------------------
-- exam_answers: trava de campos — a correção (correta/nota/comentario) só
-- pode vir da rota de servidor (service_role), nunca do aluno direto.
-- ---------------------------------------------------------------------

create or replace function public.enforce_exam_answer_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.correta is not null or new.nota is not null or new.comentario is not null then
      raise exception 'Este campo só pode ser definido pelo servidor.';
    end if;
  else
    if new.correta is distinct from old.correta
      or new.nota is distinct from old.nota
      or new.comentario is distinct from old.comentario
      or new.attempt_id is distinct from old.attempt_id
      or new.question_id is distinct from old.question_id
    then
      raise exception 'Este campo só pode ser alterado pelo servidor.';
    end if;
  end if;

  return new;
end;
$$;

create trigger exam_answers_before_write_lock_fields
  before insert or update on public.exam_answers
  for each row
  execute function public.enforce_exam_answer_write_rules();

-- ---------------------------------------------------------------------
-- exam_attempts: RLS
-- ---------------------------------------------------------------------

alter table public.exam_attempts enable row level security;

create policy "exam_attempts_select_own_or_admin"
  on public.exam_attempts for select
  using (user_id = auth.uid() or public.is_admin());

create policy "exam_attempts_insert_own"
  on public.exam_attempts for insert
  with check (user_id = auth.uid() or public.is_admin());

-- USING roda sobre a linha antes do update: só deixa mexer enquanto ainda
-- está em_andamento. Depois de enviada vira somente leitura pro aluno —
-- e a trava de campos acima ainda impede qualquer alteração de nota/status
-- mesmo que essa condição de status um dia mude.
create policy "exam_attempts_update_own_em_andamento_or_admin"
  on public.exam_attempts for update
  using ((user_id = auth.uid() and status = 'em_andamento') or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- exam_answers: RLS
-- ---------------------------------------------------------------------

alter table public.exam_answers enable row level security;

create policy "exam_answers_select_own_or_admin"
  on public.exam_answers for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = exam_answers.attempt_id and a.user_id = auth.uid()
    )
  );

create policy "exam_answers_insert_own_em_andamento"
  on public.exam_answers for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = exam_answers.attempt_id
        and a.user_id = auth.uid()
        and a.status = 'em_andamento'
    )
  );

create policy "exam_answers_update_own_em_andamento"
  on public.exam_answers for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = exam_answers.attempt_id
        and a.user_id = auth.uid()
        and a.status = 'em_andamento'
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = exam_answers.attempt_id
        and a.user_id = auth.uid()
        and a.status = 'em_andamento'
    )
  );

-- ---------------------------------------------------------------------
-- attempt_grants: RLS
-- ---------------------------------------------------------------------

alter table public.attempt_grants enable row level security;

create policy "attempt_grants_select_own_or_admin"
  on public.attempt_grants for select
  using (user_id = auth.uid() or public.is_admin());

create policy "attempt_grants_admin_insert"
  on public.attempt_grants for insert
  with check (public.is_admin());
