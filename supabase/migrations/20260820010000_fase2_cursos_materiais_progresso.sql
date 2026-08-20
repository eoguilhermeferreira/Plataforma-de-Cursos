-- Fase 2: cursos, aulas, matrículas, progresso, marca d'água e RLS.
--
-- As tabelas são todas criadas primeiro, e só depois vêm RLS/policies/
-- triggers: as policies de courses e lessons fazem referência à tabela
-- enrollments, então enrollments precisa existir antes de qualquer
-- "create policy" ser executado.

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  capa_path text,
  publico text not null default 'interno' check (publico in ('interno', 'externo')),
  publicado boolean not null default false,
  criado_em timestamptz not null default now()
);

comment on table public.courses is 'Cursos. Interno e externo nunca compartilham matrícula.';

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  titulo text not null,
  ordem int not null default 0,
  pdf_path text not null,
  versao int not null default 1,
  tempo_minimo_segundos int not null default 180,
  publicado boolean not null default false,
  atualizado_em timestamptz not null default now()
);

comment on column public.lessons.pdf_path is 'Caminho do PDF original no bucket privado materiais. Nunca servido direto.';
comment on column public.lessons.versao is 'Incrementada a cada substituição do PDF. Limpa watermarked_files da aula.';

create index lessons_course_id_idx on public.lessons (course_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  origem text not null check (origem in ('convite', 'compra')),
  status text not null default 'ativa' check (status in ('ativa', 'revogada')),
  criado_em timestamptz not null default now(),
  revogado_em timestamptz,
  motivo_revogacao text,
  unique (user_id, course_id)
);

create index enrollments_user_id_idx on public.enrollments (user_id);
create index enrollments_course_id_idx on public.enrollments (course_id);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  segundos_lidos int not null default 0,
  concluido_em timestamptz,
  versao_lida int,
  unique (user_id, lesson_id)
);

create index lesson_progress_user_id_idx on public.lesson_progress (user_id);

create table public.watermarked_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  versao int not null,
  path text not null,
  gerado_em timestamptz not null default now(),
  unique (user_id, lesson_id, versao)
);

comment on table public.watermarked_files is 'Cópias com marca d''água já geradas, uma por aluno/aula/versão. Reusadas, nunca geradas de novo à toa.';

-- ---------------------------------------------------------------------
-- courses: RLS
-- ---------------------------------------------------------------------

alter table public.courses enable row level security;

-- Admin enxerga e gerencia tudo. Aluno só enxerga curso publicado em que tem
-- matrícula ativa.
create policy "courses_select_admin_or_enrolled"
  on public.courses
  for select
  using (
    public.is_admin()
    or (
      publicado = true
      and exists (
        select 1
        from public.enrollments e
        where e.course_id = courses.id
          and e.user_id = auth.uid()
          and e.status = 'ativa'
      )
    )
  );

create policy "courses_admin_insert"
  on public.courses for insert
  with check (public.is_admin());

create policy "courses_admin_update"
  on public.courses for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "courses_admin_delete"
  on public.courses for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- lessons: RLS
-- ---------------------------------------------------------------------

alter table public.lessons enable row level security;

create policy "lessons_select_admin_or_enrolled"
  on public.lessons
  for select
  using (
    public.is_admin()
    or (
      publicado = true
      and exists (
        select 1
        from public.enrollments e
        where e.course_id = lessons.course_id
          and e.user_id = auth.uid()
          and e.status = 'ativa'
      )
    )
  );

create policy "lessons_admin_insert"
  on public.lessons for insert
  with check (public.is_admin());

create policy "lessons_admin_update"
  on public.lessons for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "lessons_admin_delete"
  on public.lessons for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- enrollments: RLS
-- ---------------------------------------------------------------------

alter table public.enrollments enable row level security;

create policy "enrollments_select_own_or_admin"
  on public.enrollments
  for select
  using (user_id = auth.uid() or public.is_admin());

create policy "enrollments_admin_insert"
  on public.enrollments for insert
  with check (public.is_admin());

create policy "enrollments_admin_update"
  on public.enrollments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "enrollments_admin_delete"
  on public.enrollments for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- lesson_progress: RLS + trigger de tempo mínimo
-- ---------------------------------------------------------------------

alter table public.lesson_progress enable row level security;

create policy "lesson_progress_select_own_or_admin"
  on public.lesson_progress
  for select
  using (user_id = auth.uid() or public.is_admin());

create policy "lesson_progress_insert_own"
  on public.lesson_progress for insert
  with check (user_id = auth.uid());

create policy "lesson_progress_update_own_or_admin"
  on public.lesson_progress for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- O tempo mínimo de leitura é decidido pelo servidor, nunca só pelo cliente
-- (regra 7 do CLAUDE.md). RLS permite ao aluno escrever a própria linha, mas
-- este trigger barra a transição para "concluída" se segundos_lidos ainda
-- não atingiu tempo_minimo_segundos da aula — mesmo que a escrita venha
-- direto da API do Supabase e não pela rota /api/aulas/[id]/concluir.
create or replace function public.enforce_lesson_completion_minimum()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tempo_minimo int;
begin
  if new.concluido_em is not null and (tg_op = 'INSERT' or old.concluido_em is null) then
    select tempo_minimo_segundos into tempo_minimo
    from public.lessons
    where id = new.lesson_id;

    if tempo_minimo is not null and new.segundos_lidos < tempo_minimo then
      raise exception 'Tempo mínimo de leitura ainda não atingido.';
    end if;
  end if;

  return new;
end;
$$;

create trigger lesson_progress_before_write_completion
  before insert or update on public.lesson_progress
  for each row
  execute function public.enforce_lesson_completion_minimum();

-- ---------------------------------------------------------------------
-- watermarked_files: RLS
-- ---------------------------------------------------------------------

alter table public.watermarked_files enable row level security;

-- Nenhuma policy de propósito: só a rota de servidor (service_role) gera,
-- lê e apaga estas linhas. O aluno nunca consulta esta tabela diretamente,
-- só recebe a signed URL via /api/aulas/[id]/arquivo.

-- ---------------------------------------------------------------------
-- Storage: bucket privado de materiais
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiais', 'materiais', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- Nenhuma policy criada em storage.objects de propósito: com RLS ligada
-- (padrão do Supabase Storage) e zero policies, nem anon nem authenticated
-- leem ou escrevem no bucket. Só service_role, usado exclusivamente em
-- rotas de servidor, acessa os arquivos.
