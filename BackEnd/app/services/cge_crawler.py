"""
FloodGuard AI — Coletor e Processador Dinâmico de Alagamentos (CGE SP / PMSP)
Responsável por:
1. Buscar o boletim oficial de alagamentos em https://www.cgesp.org/v3/alagamentos.jsp
2. Extrair pontos ativos e inativos (Bairro, Logradouro, Sentido, Horário, Status)
3. Geocodificar os endereços (Nominatim OSM + Caching + Fallbacks de bairros)
4. Persistir no Supabase e no banco local para consumo instantâneo no mapa
"""
import re
import urllib.parse
from datetime import datetime, date, timezone
from typing import List, Dict, Optional, Tuple
import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..models.flood_event import DynamicFloodEvent

# Cache em memória para evitar chamadas repetidas ao Nominatim
_GEOCODE_CACHE: Dict[str, Tuple[float, float]] = {}

# Centroides conhecidos de bairros/regiões de SP (fallback seguro se o logradouro for muito genérico)
SP_NEIGHBORHOOD_CENTROIDS = {
    "casa verde": (-23.5042, -46.6578),
    "santana": (-23.5025, -46.6268),
    "sé": (-23.5505, -46.6333),
    "liberdade": (-23.5580, -46.6340),
    "glicério": (-23.5592, -46.6288),
    "mooca": (-23.5560, -46.5980),
    "tatuapé": (-23.5400, -46.5750),
    "aricanduva": (-23.5550, -46.5250),
    "lapa": (-23.5220, -46.7020),
    "barra funda": (-23.5260, -46.6660),
    "pompeia": (-23.5280, -46.6850),
    "perdizes": (-23.5350, -46.6780),
    "pinheiros": (-23.5650, -46.6950),
    "butantã": (-23.5710, -46.7080),
    "santo amaro": (-23.6520, -46.7080),
    "ipiranga": (-23.5920, -46.6080),
    "vila prudente": (-23.5850, -46.5820),
    "itaim paulista": (-23.5010, -46.3980),
    "itaquera": (-23.5350, -46.4550),
    "penha": (-23.5250, -46.5450),
    "freguesia do ó": (-23.5000, -46.6980),
    "limão": (-23.5120, -46.6750),
    "vila maria": (-23.5110, -46.5920),
}


def clean_street_name(name: str) -> str:
    """Limpa abreviações usuais do CGE para melhor taxa de acerto no geocoding."""
    if not name:
        return ""
    text = name.strip()
    # Expande abreviações comuns
    subs = [
        (r'\bR\b\.?', 'Rua'),
        (r'\bAV\b\.?', 'Avenida'),
        (r'\bPCA\b\.?', 'Praça'),
        (r'\bAL\b\.?', 'Alameda'),
        (r'\bVDO\b\.?', 'Viaduto'),
        (r'\bTN\b\.?', 'Túnel'),
        (r'\bESTR\b\.?', 'Estrada'),
        (r'\bNSRA\b\.?', 'Nossa Senhora'),
        (r'\bDR\b\.?', 'Doutor'),
        (r'\bCEL\b\.?', 'Coronel'),
        (r'\bBRG\b\.?', 'Brigadeiro'),
        (r'\bPROF\b\.?', 'Professor'),
    ]
    for pattern, replacement in subs:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text.strip()


def geocode_address(logradouro: str, bairro: str, referencia: str = None) -> Tuple[Optional[float], Optional[float]]:
    """
    Geocodifica o endereço usando OpenStreetMap / Nominatim com cache e fallback de bairro.
    """
    cache_key = f"{logradouro.lower().strip()}|{bairro.lower().strip()}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    clean_street = clean_street_name(logradouro)
    queries = [
        f"{clean_street}, {bairro}, São Paulo, SP, Brasil",
        f"{clean_street}, São Paulo, SP, Brasil"
    ]

    coords = None
    headers = {"User-Agent": "FloodGuard-AI-CGE-Sync/1.0 (contato@floodguard.ai)"}

    for query in queries:
        try:
            url = f"https://nominatim.openstreetmap.org/search?format=json&limit=1&q={urllib.parse.quote(query)}"
            with httpx.Client(timeout=4.0, verify=False) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data and len(data) > 0:
                        lat = float(data[0]["lat"])
                        lon = float(data[0]["lon"])
                        # Validação geográfica estrita para a Grande SP
                        if -24.0 <= lat <= -23.3 and -47.0 <= lon <= -46.2:
                            coords = (lat, lon)
                            break
        except Exception:
            pass

    # Fallback para o centroide do bairro se não encontrou o número/rua exata
    if not coords:
        b_clean = bairro.lower().strip()
        for b_key, b_coords in SP_NEIGHBORHOOD_CENTROIDS.items():
            if b_key in b_clean or b_clean in b_key:
                coords = b_coords
                break

    if not coords:
        # Fallback padrão central de São Paulo (Praça da Sé)
        coords = (-23.5505, -46.6333)

    _GEOCODE_CACHE[cache_key] = coords
    return coords


def fetch_cge_html(date_str: Optional[str] = None) -> str:
    """Busca o HTML da página oficial de alagamentos do CGE."""
    base_url = "https://www.cgesp.org/v3/alagamentos.jsp"
    params = {}
    if date_str:
        # Aceita YYYY-MM-DD ou DD/MM/YYYY
        if "-" in date_str:
            parts = date_str.split("-")
            date_str = f"{parts[2]}/{parts[1]}/{parts[0]}"
        params["dataBusca"] = date_str

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    try:
        with httpx.Client(timeout=10.0, verify=False, follow_redirects=True) as client:
            resp = client.get(base_url, params=params, headers=headers)
            resp.raise_for_status()
            # O portal CGE SP utiliza nativamente codificação ISO-8859-1 / Windows-1252
            content = resp.content
            try:
                return content.decode("iso-8859-1")
            except Exception:
                try:
                    return content.decode("utf-8")
                except UnicodeDecodeError:
                    return content.decode("latin-1", errors="replace")
    except Exception as e:
        print(f"[CGE_Crawler] Erro ao buscar HTML: {e}")
        return ""


def parse_cge_floods(html: str) -> List[Dict]:
    """Extrai os pontos de alagamento estruturados do HTML da CGE."""
    if not html:
        return []

    results = []
    # Localiza todas as tabelas com classe tb-pontos-de-alagamentos
    tables = re.findall(r'<table[^>]*class=["\']tb-pontos-de-alagamentos["\'][^>]*>(.*?)</table>', html, re.DOTALL | re.IGNORECASE)

    for table in tables:
        # Extrai o bairro
        bairro_match = re.search(r'<td[^>]*class=["\'][^"\']*bairro[^"\']*["\'][^>]*>\s*([^<]+)', table, re.IGNORECASE)
        bairro = bairro_match.group(1).strip() if bairro_match else "São Paulo"

        # Extrai os blocos ponto-de-alagamento
        pontos = re.findall(r'<div[^>]*class=["\']ponto-de-alagamento["\'][^>]*>(.*?)</div>', table, re.DOTALL | re.IGNORECASE)

        for p_html in pontos:
            # 1. Status (ex: ativo-intransitavel, inativo-transitavel)
            status_match = re.search(r'<li[^>]*class=["\']([^"\']*(?:ativo|inativo)[^"\']*)["\'](?:\s+title=["\']([^"\']*)["\'])?', p_html, re.IGNORECASE)
            status_raw = status_match.group(1).lower() if status_match else "ativo-transitavel"
            title_raw = status_match.group(2) if (status_match and status_match.group(2)) else status_raw

            is_ativo = "ativo" in status_raw
            is_intransitavel = "intransit" in status_raw or "intransit" in title_raw.lower()

            status_normalized = "ativo_intransitavel" if (is_ativo and is_intransitavel) else \
                                "ativo_transitavel" if is_ativo else \
                                "inativo_intransitavel" if is_intransitavel else "inativo_transitavel"

            # 2. Horários e Logradouro
            desc_match = re.search(r'<li[^>]*col-local[^>]*>(?:De\s+([0-9:]+)(?:\s+a\s+([0-9:]+))?)?<br\s*/?>\s*([^<]+)</li>', p_html, re.IGNORECASE)
            h_inicio = desc_match.group(1).strip() if (desc_match and desc_match.group(1)) else None
            h_fim = desc_match.group(2).strip() if (desc_match and desc_match.group(2)) else None
            logradouro = desc_match.group(3).strip() if desc_match else ""

            # 3. Sentido e Referência
            sent_match = re.search(r'Sentido:\s*([^<]*)<br\s*/?>Refer[êe]ncia:\s*([^<]*)', p_html, re.IGNORECASE)
            sentido = sent_match.group(1).strip() if sent_match else "AMBOS"
            referencia = sent_match.group(2).strip() if sent_match else ""

            if logradouro:
                results.append({
                    "bairro": bairro,
                    "logradouro": logradouro,
                    "referencia": referencia,
                    "sentido": sentido,
                    "status": status_normalized,
                    "horario_inicio": h_inicio,
                    "horario_fim": h_fim,
                    "is_ativo": is_ativo
                })

    return results


def sync_cge_floods(target_date: Optional[str] = None, db: Optional[Session] = None) -> Dict:
    """
    Executa o ciclo completo de sincronização:
    Busca -> Extrai -> Geocodifica -> Salva no Banco Local e no Supabase.
    """
    html = fetch_cge_html(target_date)
    parsed = parse_cge_floods(html)

    hoje = date.today()
    if target_date and "-" in target_date:
        try:
            hoje = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    total_encontrados = len(parsed)
    total_novos = 0
    total_ativos = 0

    saved_items = []

    for item in parsed:
        if "ativo" in item["status"]:
            total_ativos += 1

        lat, lon = geocode_address(item["logradouro"], item["bairro"], item["referencia"])

        record = {
            "bairro": item["bairro"],
            "logradouro": item["logradouro"],
            "referencia": item["referencia"],
            "sentido": item["sentido"],
            "status": item["status"],
            "horario_inicio": item["horario_inicio"],
            "horario_fim": item["horario_fim"],
            "data_evento": hoje.isoformat(),
            "latitude": lat,
            "longitude": lon,
            "fonte": "CGE_SP"
        }
        saved_items.append(record)

        # Salva no banco local SQLAlchemy (se sessão fornecida)
        if db:
            existente = db.query(DynamicFloodEvent).filter(
                DynamicFloodEvent.logradouro == item["logradouro"],
                DynamicFloodEvent.bairro == item["bairro"],
                DynamicFloodEvent.data_evento == hoje
            ).first()

            if existente:
                existente.status = item["status"]
                existente.horario_fim = item["horario_fim"]
                existente.latitude = lat
                existente.longitude = lon
            else:
                novo = DynamicFloodEvent(
                    bairro=item["bairro"],
                    logradouro=item["logradouro"],
                    referencia=item["referencia"],
                    sentido=item["sentido"],
                    status=item["status"],
                    horario_inicio=item["horario_inicio"],
                    horario_fim=item["horario_fim"],
                    data_evento=hoje,
                    latitude=lat,
                    longitude=lon,
                    fonte="CGE_SP"
                )
                db.add(novo)
                total_novos += 1

    if db:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[CGE_Crawler] Erro ao commitar no SQLite local: {e}")

    # Sincroniza também no Supabase (se configurado)
    try:
        from ..supabase_client import get_supabase
        sb = get_supabase()
        if sb and saved_items:
            # Upsert na tabela dynamic_flood_events
            sb.table("dynamic_flood_events").upsert(saved_items).execute()
    except Exception as e:
        print(f"[CGE_Crawler] Nota: Supabase sync: {e}")

    return {
        "sucesso": True,
        "mensagem": f"Sincronização CGE concluída. {total_encontrados} registros processados ({total_ativos} ativos).",
        "total_encontrados": total_encontrados,
        "total_novos": total_novos,
        "total_ativos": total_ativos,
        "data_consulta": hoje.isoformat()
    }
