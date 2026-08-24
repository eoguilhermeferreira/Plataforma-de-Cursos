-- Decisão de negócio: não existe mais separação de público (interno/
-- externo) nem matrícula manual por curso. Todo curso publicado passa a
-- valer automaticamente para qualquer aluno com conta ativa — o admin só
-- decide quando publicar, não mais para quem.

-- ---------------------------------------------------------------------
-- Helper: aluno com conta ativa (substitui a checagem de matrícula ativa)
-- ---------------------------------------------------------------------

create or replace function public.is_active_profile()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and ativo = true
  );
$$;

-- ---------------------------------------------------------------------
-- courses: RLS — publicado + conta ativa, sem checar enrollments
-- ---------------------------------------------------------------------

drop policy if exists "courses_select_admin_or_enrolled" on public.courses;

create policy "courses_select_admin_or_published"
  on public.courses
  for select
  using (public.is_admin() or (publicado = true and public.is_active_profile()));

-- ---------------------------------------------------------------------
-- lessons: RLS
-- ---------------------------------------------------------------------

drop policy if exists "lessons_select_admin_or_enrolled" on public.lessons;

create policy "lessons_select_admin_or_published"
  on public.lessons
  for select
  using (public.is_admin() or (publicado = true and public.is_active_profile()));

-- ---------------------------------------------------------------------
-- exams: RLS
-- ---------------------------------------------------------------------

drop policy if exists "exams_select_admin_or_enrolled_published" on public.exams;

create policy "exams_select_admin_or_published"
  on public.exams
  for select
  using (public.is_admin() or (status = 'publicada' and public.is_active_profile()));

-- ---------------------------------------------------------------------
-- exam_questions: RLS
-- ---------------------------------------------------------------------

drop policy if exists "exam_questions_select_admin_or_enrolled_published" on public.exam_questions;

create policy "exam_questions_select_admin_or_published"
  on public.exam_questions
  for select
  using (
    public.is_admin()
    or (
      public.is_active_profile()
      and exists (
        select 1
        from public.exams ex
        where ex.id = exam_questions.exam_id
          and ex.status = 'publicada'
      )
    )
  );

-- ---------------------------------------------------------------------
-- exam_attempts: trigger de início — troca a exigência de matrícula ativa
-- por conta ativa (o acesso ao curso em si já não depende de matrícula).
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

  if not exists (
    select 1 from public.profiles
    where id = new.user_id and ativo = true
  ) then
    raise exception 'Conta inativa.';
  end if;

  select course_id, tentativas_max into v_course_id, v_tentativas_max
  from public.exams
  where id = new.exam_id and status = 'publicada';

  if v_course_id is null then
    raise exception 'Prova não encontrada ou não publicada.';
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

-- ---------------------------------------------------------------------
-- courses: remove o campo público (interno/externo) — não existe mais
-- separação de audiência entre cursos.
-- ---------------------------------------------------------------------

alter table public.courses drop column if exists publico;
