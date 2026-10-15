-- ============================================================
-- FloodGuard AI — Supabase Setup & Migration Script (Idempotente)
-- Execute este ficheiro no SQL Editor do Supabase:
--   Dashboard → Project → SQL Editor → New Query → Run
--
-- Este script funciona tanto para tabelas NOVAS quanto tabelas
-- que JÁ EXISTIAM (adiciona colunas em falta sem apagar dados).
-- ============================================================


-- ─── 1. TABELA: profiles ────────────────────────────────────────────────────
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key
);

-- Adiciona/garante todas as colunas necessárias na tabela profiles
alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists celular text;
alter table public.profiles add column if not exists data_nascimento date;

-- Locais salvos: Casa
alter table public.profiles add column if not exists home_address text;
alter table public.profiles add column if not exists home_lat float8;
alter table public.profiles add column if not exists home_lon float8;
alter table public.profiles add column if not exists home_nome text;
alter table public.profiles add column if not exists home_bairro text;
alter table public.profiles add column if not exists home_alt float8;

-- Locais salvos: Trabalho
alter table public.profiles add column if not exists work_address text;
alter table public.profiles add column if not exists work_lat float8;
alter table public.profiles add column if not exists work_lon float8;
alter table public.profiles add column if not exists work_nome text;
alter table public.profiles add column if not exists work_bairro text;
alter table public.profiles add column if not exists work_alt float8;

alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

comment on table public.profiles is 'Perfis estendidos dos utilizadores — dados adicionais ao Supabase Auth.';


-- ─── 2. TABELA: search_history ──────────────────────────────────────────────
create table if not exists public.search_history (
    id bigserial primary key
);

-- Adiciona/garante todas as colunas necessárias na tabela search_history
alter table public.search_history add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.search_history add column if not exists termo_busca text;
alter table public.search_history add column if not exists lat float8;
alter table public.search_history add column if not exists lon float8;
alter table public.search_history add column if not exists bairro text;
alter table public.search_history add column if not exists dados_adicionais text;
alter table public.search_history add column if not exists criado_em timestamptz default now();
alter table public.search_history add column if not exists created_at timestamptz default now();

-- Se a tabela antiga usava created_at, sincroniza para criado_em
do $$
begin
    if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'search_history' and column_name = 'created_at'
    ) and exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'search_history' and column_name = 'criado_em'
    ) then
        update public.search_history set criado_em = coalesce(criado_em, created_at);
        update public.search_history set created_at = coalesce(created_at, criado_em);
    end if;
end $$;

comment on table public.search_history is 'Histórico de buscas de regiões de risco por utilizador.';

-- Índice para acelerar queries de histórico por utilizador
create index if not exists idx_search_history_user_id
    on public.search_history (user_id, criado_em desc);


-- ─── 3. ROW LEVEL SECURITY (RLS) ────────────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
    on public.profiles for insert
    with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
    on public.profiles for update
    using (auth.uid() = id);

drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own"
    on public.profiles for delete
    using (auth.uid() = id);


-- search_history
alter table public.search_history enable row level security;

drop policy if exists "search_history: select own" on public.search_history;
create policy "search_history: select own"
    on public.search_history for select
    using (auth.uid() = user_id);

drop policy if exists "search_history: insert own" on public.search_history;
create policy "search_history: insert own"
    on public.search_history for insert
    with check (auth.uid() = user_id);

drop policy if exists "search_history: update own" on public.search_history;
create policy "search_history: update own"
    on public.search_history for update
    using (auth.uid() = user_id);

drop policy if exists "search_history: delete own" on public.search_history;
create policy "search_history: delete own"
    on public.search_history for delete
    using (auth.uid() = user_id);


-- ─── 4. TRIGGER: criar perfil automaticamente no signup ─────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, nome)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
    )
    on conflict (id) do update set
        nome = coalesce(excluded.nome, public.profiles.nome);
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();


-- ─── 5. FUNÇÃO: updated_at automático em profiles ───────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute procedure public.set_updated_at();


-- ─── FIM DO SCRIPT ───────────────────────────────────────────────────────────
