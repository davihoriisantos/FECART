-- ==============================================================================
-- FloodGuard AI — Matriz de Risco Histórico (Janela Dinâmica de 2 Anos)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Índice para acelerar a busca na janela temporal de 2 anos
create index if not exists idx_flood_events_2y 
on public.dynamic_flood_events(data_evento desc, bairro, logradouro);

-- 2. View da Matriz de Risco Histórico (Agrupamento por Via e Bairro nos últimos 2 anos)
create or replace view public.view_chronic_risk_zones_2y as
select 
    md5(lower(bairro) || '|' || lower(logradouro)) as cluster_id,
    bairro,
    logradouro,
    round(avg(latitude)::numeric, 6) as latitude_centro,
    round(avg(longitude)::numeric, 6) as longitude_centro,
    500 as raio_metros,
    count(*) as total_ocorrencias,
    count(*) filter (where status like '%intransitavel%') as total_intransitavel,
    count(*) filter (where status like '%transitavel%') as total_transitavel,
    min(data_evento) as primeira_ocorrencia,
    max(data_evento) as ultima_ocorrencia,
    case 
        when count(*) >= 5 then 'critico'
        when count(*) >= 3 then 'alto'
        else 'moderado'
    end as nivel_risco,
    case 
        when count(*) >= 5 then 'Risco Extremo (Crítico)'
        when count(*) >= 3 then 'Risco Alto'
        else 'Risco Moderado'
    end as tag_risco,
    case 
        when count(*) >= 5 then '#7F1D1D' -- Vermelho Escuro
        when count(*) >= 3 then '#DC2626' -- Vermelho
        else '#F59E0B'                   -- Âmbar / Amarelo
    end as cor_hex
from public.dynamic_flood_events
where data_evento >= current_date - interval '2 years'
  and latitude is not null 
  and longitude is not null
group by bairro, logradouro;

-- 3. Conceder permissão de leitura pública para a View
grant select on public.view_chronic_risk_zones_2y to anon, authenticated;
