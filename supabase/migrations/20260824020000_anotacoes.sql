-- Bloco de anotações do aluno: um texto livre por aluno, autosave.

create table public.anotacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade unique,
  texto text not null default '',
  atualizado_em timestamptz not null default now()
);

alter table public.anotacoes enable row level security;

create policy "anotacoes_select_own_or_admin"
  on public.anotacoes for select
  using (user_id = auth.uid() or public.is_admin());

create policy "anotacoes_insert_own"
  on public.anotacoes for insert
  with check (user_id = auth.uid());

create policy "anotacoes_update_own"
  on public.anotacoes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
