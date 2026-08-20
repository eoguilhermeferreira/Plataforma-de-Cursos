-- Fase 1: profiles, invites, trigger de criação de profile e RLS.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  cpf text,
  telefone text,
  papel text not null default 'aluno' check (papel in ('admin', 'avaliador', 'aluno')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuário. id = auth.users.id.';
comment on column public.profiles.papel is 'admin | avaliador | aluno. Só admin altera.';

-- Função helper para usar nas policies. security definer: evita recursão de
-- RLS ao consultar a própria tabela profiles de dentro de uma policy.
create or replace function public.is_admin()
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
      and papel = 'admin'
  );
$$;

-- Cria o profile automaticamente quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, papel)
  values (new.id, 'aluno');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Impede que o próprio usuário altere papel ou ativo via update direto na
-- tabela (RLS por si só não garante isso de forma confiável em UPDATE, um
-- trigger comparando OLD/NEW é a forma correta). Admin pode alterar.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.papel is distinct from old.papel and not public.is_admin() then
    raise exception 'Você não tem permissão para alterar o papel.';
  end if;

  if new.ativo is distinct from old.ativo and not public.is_admin() then
    raise exception 'Você não tem permissão para alterar o status ativo.';
  end if;

  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

alter table public.profiles enable row level security;

-- O usuário lê o próprio registro. Admin lê todos.
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

-- O usuário edita o próprio registro (papel/ativo travados pelo trigger
-- acima). Admin edita qualquer registro.
create policy "profiles_update_own_or_admin"
  on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Nenhuma policy de insert/delete: profiles só é criado pelo trigger
-- (security definer, ignora RLS) e nunca apagado pelo cliente.

-- ---------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  token_hash text not null,
  course_ids uuid[] not null default '{}',
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_por uuid references public.profiles (id),
  criado_em timestamptz not null default now()
);

comment on table public.invites is 'Convites de acesso. Só acessível via service_role (rotas de servidor).';
comment on column public.invites.token_hash is 'Hash do token enviado por email. O token em si nunca é gravado.';

create index invites_email_idx on public.invites (email);
create index invites_token_hash_idx on public.invites (token_hash);

alter table public.invites enable row level security;

-- Nenhuma policy criada de propósito: com RLS ligada e zero policies,
-- anon e authenticated não enxergam nenhuma linha. Só service_role, que
-- ignora RLS por padrão no Supabase, acessa esta tabela — e isso só
-- acontece em rotas de servidor (app/api/**).
