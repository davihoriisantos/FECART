-- ==============================================================================
-- FloodGuard AI — Tabela de Ocorrências Dinâmicas de Alagamento (CGE SP / Defesa Civil)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

create table if not exists public.dynamic_flood_events (
    id uuid primary key default gen_random_uuid(),
    bairro text not null,
    logradouro text not null,
    referencia text,
    sentido text,
    status text not null, -- 'ativo_intransitavel', 'ativo_transitavel', 'inativo_transitavel', etc.
    horario_inicio text,
    horario_fim text,
    data_evento date not null default current_date,
    latitude double precision,
    longitude double precision,
    fonte text not null default 'CGE_SP',
    criado_em timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

-- Índices geoespaciais e temporais
create index if not exists idx_flood_events_data on public.dynamic_flood_events(data_evento desc);
create index if not exists idx_flood_events_status on public.dynamic_flood_events(status);
create index if not exists idx_flood_events_coords on public.dynamic_flood_events(latitude, longitude);

-- Garantir RLS ativado
alter table public.dynamic_flood_events enable row level security;

-- Política de leitura pública (qualquer visitante do mapa pode consultar)
drop policy if exists "dynamic_flood_events_public_select" on public.dynamic_flood_events;
create policy "dynamic_flood_events_public_select"
on public.dynamic_flood_events for select
using (true);

-- Política de inserção/atualização (chave anônima/service ou autenticado)
drop policy if exists "dynamic_flood_events_insert_all" on public.dynamic_flood_events;
create policy "dynamic_flood_events_insert_all"
on public.dynamic_flood_events for all
using (true)
with check (true);
