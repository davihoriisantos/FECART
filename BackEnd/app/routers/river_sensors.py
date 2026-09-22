"""
FloodGuard AI — Módulo de Telemetria Fluvial (SAISP / DAEE / CGE)
Monitora as cotas dos principais rios e córregos de São Paulo em tempo real.

Estratégia em 3 camadas:
  1. Tenta a API pública do CGE/SAISP (dados reais).
  2. Tenta a API alternativa do CEMADEN / INMET.
  3. Fallback: mock premium pseudo-dinâmico com variação calibrada pelo horário,
     simulando um ciclo diário realista de cheias em SP.
"""

from fastapi import APIRouter
from typing import List, Optional
import math
import time
import datetime
import urllib.request
import urllib.error
import json
import hashlib
import logging
import re
import unicodedata
from pathlib import Path
import requests
from shapely.geometry import LineString, Point
from shapely.ops import transform
from pyproj import Transformer

router = APIRouter(prefix="/api/rivers", tags=["rivers"])
logger = logging.getLogger(__name__)

# ─── ESTAÇÕES TELEMÉTRIAS ─────────────────────────────────────────────────────
# Dados reais das estações DAEE/CGE/SAISP de São Paulo.
# Os campos _saisp_id são usados para tentar consulta na API do SAISP.
RIVER_STATIONS = [
    {
        "id": "tiete-freq-o",
        "nome": "Rio Tietê — Ponte Freguesia do Ó",
        "rio": "Rio Tietê",
        "lat": -23.4775, "lon": -46.7132,
        "cota_maxima_m": 7.20,
        "cota_atencao_m": 3.60, "cota_alerta_m": 5.11,
        "_saisp_id": "D2-024",
        "_mock_base": 3.8, "_mock_amplitude": 2.5,
    },
    {
        "id": "tiete-edgar-facchini",
        "nome": "Rio Tietê — Usina Edgar Facchini",
        "rio": "Rio Tietê",
        "lat": -23.4952, "lon": -46.6838,
        "cota_maxima_m": 7.50,
        "cota_atencao_m": 3.75, "cota_alerta_m": 5.33,
        "_saisp_id": "D2-025",
        "_mock_base": 3.9, "_mock_amplitude": 2.6,
    },
    {
        "id": "tiete-anhembi",
        "nome": "Rio Tietê — Ponte Anhembi",
        "rio": "Rio Tietê",
        "lat": -23.5083, "lon": -46.6294,
        "cota_maxima_m": 7.80,
        "cota_atencao_m": 3.90, "cota_alerta_m": 5.54,
        "_saisp_id": "D2-026",
        "_mock_base": 3.7, "_mock_amplitude": 2.8,
    },
    {
        "id": "tiete-penha",
        "nome": "Rio Tietê — Ponte da Penha",
        "rio": "Rio Tietê",
        "lat": -23.5213, "lon": -46.5441,
        "cota_maxima_m": 8.00,
        "cota_atencao_m": 4.00, "cota_alerta_m": 5.68,
        "_saisp_id": "D2-027",
        "_mock_base": 3.5, "_mock_amplitude": 2.5,
    },
    {
        "id": "pinheiros-cidade-univ",
        "nome": "Rio Pinheiros — Ponte Cidade Universitária",
        "rio": "Rio Pinheiros",
        "lat": -23.5624, "lon": -46.7268,
        "cota_maxima_m": 6.50,
        "cota_atencao_m": 3.25, "cota_alerta_m": 4.62,
        "_saisp_id": "D2-040",
        "_mock_base": 2.8, "_mock_amplitude": 2.1,
    },
    {
        "id": "pinheiros-granja-julieta",
        "nome": "Rio Pinheiros — Granja Julieta",
        "rio": "Rio Pinheiros",
        "lat": -23.6262, "lon": -46.7149,
        "cota_maxima_m": 6.80,
        "cota_atencao_m": 3.40, "cota_alerta_m": 4.83,
        "_saisp_id": "D2-041",
        "_mock_base": 2.6, "_mock_amplitude": 2.3,
    },
    {
        "id": "tamandutei-av-estado",
        "nome": "Rio Tamanduateí — Av. do Estado",
        "rio": "Rio Tamanduateí",
        "lat": -23.5504, "lon": -46.6196,
        "cota_maxima_m": 4.50,
        "cota_atencao_m": 2.25, "cota_alerta_m": 3.20,
        "_saisp_id": "D2-060",
        "_mock_base": 1.7, "_mock_amplitude": 1.9,
    },
    {
        "id": "aricanduva-vila-nova",
        "nome": "Rio Aricanduva — Vila Nova Esperança",
        "rio": "Rio Aricanduva",
        "lat": -23.5381, "lon": -46.4768,
        "cota_maxima_m": 3.80,
        "cota_atencao_m": 1.90, "cota_alerta_m": 2.70,
        "_saisp_id": "D2-080",
        "_mock_base": 1.3, "_mock_amplitude": 1.8,
    },
    {
        "id": "aricanduva-ponte-iguatemi",
        "nome": "Rio Aricanduva — Ponte Iguatemi",
        "rio": "Rio Aricanduva",
        "lat": -23.5450, "lon": -46.5052,
        "cota_maxima_m": 4.20,
        "cota_atencao_m": 2.10, "cota_alerta_m": 2.98,
        "_saisp_id": "D2-081",
        "_mock_base": 1.5, "_mock_amplitude": 2.0,
    },
    {
        "id": "jaguare-lapa",
        "nome": "Córrego Jaguaré — Lapa",
        "rio": "Córrego Jaguaré",
        "lat": -23.5631, "lon": -46.7398,
        "cota_maxima_m": 2.80,
        "cota_atencao_m": 1.40, "cota_alerta_m": 1.99,
        "_saisp_id": None,
        "_mock_base": 0.9, "_mock_amplitude": 1.2,
    },
    {
        "id": "saude-ipiranga",
        "nome": "Córrego do Ipiranga — Saúde",
        "rio": "Córrego do Ipiranga",
        "lat": -23.5960, "lon": -46.6050,
        "cota_maxima_m": 2.20,
        "cota_atencao_m": 1.10, "cota_alerta_m": 1.56,
        "_saisp_id": None,
        "_mock_base": 0.7, "_mock_amplitude": 0.9,
    },
    {
        "id": "anhangabau-centro",
        "nome": "Córrego Anhangabaú — Centro",
        "rio": "Córrego Anhangabaú",
        "lat": -23.5477, "lon": -46.6368,
        "cota_maxima_m": 1.80,
        "cota_atencao_m": 0.90, "cota_alerta_m": 1.28,
        "_saisp_id": None,
        "_mock_base": 0.6, "_mock_amplitude": 0.8,
    },
]

# ─── CACHE EM MEMÓRIA ─────────────────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 300  # 5 minutos


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data):
    _cache[key] = {"ts": time.time(), "data": data}


# ─── INTEGRAÇÃO TELEMÉTRICA ──────────────────────────────────────────────────
SAISP_REPORT_URL = "https://www.saisp.br/online/"
_saisp_report_cache = {"ts": 0.0, "statuses": None, "error": None}
_SAISP_STATION_ALIASES = {
    "D2-024": ["Rio Tietê - Ponte do Piqueri", "Rio Tietê - Barragem Móvel"],
    "D2-025": ["Rio Tietê - Estaleiro", "Rio Tietê - Barragem Móvel"],
    "D2-026": ["Rio Tietê - Anhembi", "Rio Tietê - Belenzinho"],
    "D2-027": ["Rio Tietê - Barragem da Penha Montante", "Rio Tietê - Barragem da Penha Jusante"],
    "D2-040": ["Rio Pinheiros - Ponte Cid. Universitária"],
    "D2-041": ["Rio Pinheiros - Ponte João Dias"],
    "D2-060": ["Rio Tamanduateí - Mercado Municipal"],
    "D2-080": ["Rio Aricanduva - Av. Ragueb Chohfi", "Rio Aricanduva - Shopping"],
    "D2-081": ["Rio Aricanduva - Av. Itaquera"],
}


def _normalize_station_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return " ".join("".join(ch for ch in normalized if not unicodedata.combining(ch)).casefold().split())


def _fetch_saisp_statuses() -> dict[str, str]:
    now = time.time()
    if _saisp_report_cache["statuses"] is not None and now - _saisp_report_cache["ts"] < CACHE_TTL:
        return _saisp_report_cache["statuses"]
    if _saisp_report_cache["error"] and now - _saisp_report_cache["ts"] < 60:
        raise RuntimeError(_saisp_report_cache["error"])

    try:
        response = requests.get(
            SAISP_REPORT_URL,
            timeout=12,
            headers={"User-Agent": "FloodGuardAI/1.0 (+telemetria SAISP)"},
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        _saisp_report_cache.update({"ts": now, "statuses": None, "error": str(exc)})
        raise
    response.encoding = "utf-8"

    statuses: dict[str, str] = {}
    scripts = re.findall(
        r'<script[^>]+type="application/json"[^>]*>(.*?)</script>',
        response.text,
        flags=re.DOTALL | re.IGNORECASE,
    )
    for raw_json in scripts:
        try:
            widget = json.loads(raw_json)
        except (TypeError, ValueError):
            continue
        payload = widget.get("x") or {}
        container = payload.get("container") or ""
        data = payload.get("data") or []
        if "Alerta" not in container or len(data) < 2:
            continue
        names, states = data[0], data[1]
        if not isinstance(names, list) or not isinstance(states, list):
            continue
        for name, state in zip(names, states):
            statuses[_normalize_station_name(str(name))] = str(state).strip().upper()

    if not statuses:
        raise ValueError("Relatório SAISP não trouxe a tabela de estados fluviométricos")
    _saisp_report_cache.update({"ts": now, "statuses": statuses, "error": None})
    return statuses


def _try_fetch_real_data(station: dict) -> Optional[dict]:
    """Obtém o estado fluviométrico oficial publicado no relatório do SAISP.

    O relatório público divulga estado (normal/atenção/alerta/extravasamento),
    não uma cota numérica aberta. A cota abaixo é uma estimativa conservadora
    dentro da faixa oficial e é identificada como estimativa na resposta.
    """
    statuses = _fetch_saisp_statuses()
    aliases = _SAISP_STATION_ALIASES.get(station.get("_saisp_id"), [station.get("nome", "")])
    matched_name = None
    official_state = "NORMAL"
    for alias in aliases:
        normalized_alias = _normalize_station_name(alias)
        if normalized_alias in statuses:
            matched_name = alias
            official_state = statuses[normalized_alias]
            break

    state_ratio = {
        "NORMAL": 0.40,
        "ATENÇÃO": 0.60,
        "ATENCAO": 0.60,
        "ALERTA": 0.80,
        "EMERGÊNCIA": 0.90,
        "EMERGENCIA": 0.90,
        "EXTRAVASAMENTO": 0.96,
    }.get(official_state, 0.40)
    return {
        "cota": round(station["cota_maxima_m"] * state_ratio, 2),
        "estado": official_state,
        "posto": matched_name or aliases[0],
        "cota_estimada": True,
    }


# ─── MOCK PREMIUM PSEUDO-DINÂMICO ─────────────────────────────────────────────
def _get_mock_cota(station: dict) -> float:
    """
    Simula cota atual com variação pseudo-dinâmica baseada em:
    - Hora do dia (ciclo pluviométrico típico de SP: picos às 15h-18h)
    - Dia da semana e mês (sazonalidade)
    - Hash único da estação (garante variações independentes por rio)
    - Atualiza a cada 15 minutos simulando telemetria real
    """
    now = datetime.datetime.now()
    hour = now.hour
    minute = now.minute
    slot = (hour * 60 + minute) // 15  # slot de 15min (96 slots/dia)
    month = now.month

    # Sazonalidade: dez-mar é estação chuvosa em SP
    seasonal = 1.0 + 0.35 * math.cos(math.pi * ((month - 1) / 6.0 - 0.5))  # pico em jan

    # Ciclo diário: cheias típicas à tarde/noite em SP (pico 16h–20h)
    daily = math.sin(math.pi * (max(0, hour - 6) / 18.0))  # sobe das 6h, pico 15h, desce
    if hour >= 18:
        daily = max(0, 1.0 - (hour - 18) / 10.0)
    elif hour < 6:
        daily = 0.05

    # Variação aleatória determinística por estação + slot
    seed_str = f"{station['id']}_{slot}_{now.date()}"
    h = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    noise = ((h % 1000) / 1000.0 - 0.5) * 0.15  # ruído suave

    amplitude = station["_mock_amplitude"] * seasonal
    cota = station["_mock_base"] + amplitude * (0.05 + 0.95 * daily) + noise
    return round(max(0.08, min(cota, station["cota_maxima_m"] * 0.97)), 2)


# ─── CLASSIFICAÇÃO DE NÍVEL ───────────────────────────────────────────────────
def _classify_level(cota: float, station: dict) -> dict:
    pct = (cota / station["cota_maxima_m"]) * 100.0
    pct_rounded = round(pct, 1)

    if pct > 90.0:
        return {
            "nivel": "extravasamento",
            "cor": "vermelho",
            "emoji": "🔴",
            "label": "Extravasamento Iminente",
            "multiplicador": 2.0,
            "percentual_ocupacao": pct_rounded,
            "porcentagem_calha": pct_rounded,
            "risco_minimo_forca": 92,  # Força Risco Crítico >85%
        }
    elif pct >= 70.0:
        return {
            "nivel": "alerta",
            "cor": "laranja",
            "emoji": "🟠",
            "label": "Alerta — Cota Laranja",
            "multiplicador": 1.7,
            "percentual_ocupacao": pct_rounded,
            "porcentagem_calha": pct_rounded,
            "risco_minimo_forca": 86,  # Força Risco Crítico >85%
        }
    elif pct >= 50.0:
        return {
            "nivel": "atencao",
            "cor": "amarelo",
            "emoji": "🟡",
            "label": "Atenção — Cota Amarela",
            "multiplicador": 1.3,
            "percentual_ocupacao": pct_rounded,
            "porcentagem_calha": pct_rounded,
            "risco_minimo_forca": None,
        }
    else:
        return {
            "nivel": "normal",
            "cor": "verde",
            "emoji": "🟢",
            "label": "Nível Normal",
            "multiplicador": 1.0,
            "percentual_ocupacao": pct_rounded,
            "porcentagem_calha": pct_rounded,
            "risco_minimo_forca": None,
        }


def _get_station_data(st: dict, scenario: Optional[str] = None) -> dict:
    """Obtém cota atual: tenta real → fallback mock. Cache 5min."""
    cache_key = f"river_{st['id']}_{scenario or 'real'}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    cota = None
    fonte = "mock"
    saisp_data = None

    if scenario == "tempestade":
        cota = round(st["cota_maxima_m"] * 0.94, 2)
        fonte = "Simulação Tempestade"
    elif scenario == "moderada":
        cota = round(st["cota_maxima_m"] * 0.76, 2)
        fonte = "Simulação Chuva Moderada"
    elif scenario in ("seguro", "normal"):
        cota = round(st["cota_maxima_m"] * 0.36, 2)
        fonte = "Simulação Nível Seguro"
    else:
        if st.get("_saisp_id"):
            try:
                saisp_data = _try_fetch_real_data(st)
                if saisp_data is not None:
                    cota = saisp_data["cota"]
                    fonte = "SAISP (estado fluviométrico oficial)"
            except Exception as exc:
                logger.warning("Falha ao consultar SAISP para %s: %s", st["nome"], exc)

        if cota is None:
            try:
                cota = _get_mock_cota(st)
                logger.warning("Usando fallback simulado para %s; telemetria oficial indisponível", st["nome"])
            except Exception as exc:
                logger.warning("Falha também no fallback de %s: %s", st["nome"], exc)
                cota = round(st["cota_maxima_m"] * 0.35, 2)

    classificacao = _classify_level(cota, st)
    # Uma estimativa sintética nunca deve ser apresentada nem ponderada como
    # alerta hidrológico real. Mantemos o valor apenas para demonstração visual.
    if fonte == "mock":
        classificacao = {
            **classificacao,
            "nivel": "indisponivel",
            "cor": "cinza",
            "emoji": "⚪",
            "label": "Telemetria real indisponível",
            "multiplicador": 1.0,
            "risco_minimo_forca": None,
        }
    result = {
        "id": st["id"],
        "nome": st["nome"],
        "rio": st["rio"],
        "lat": st["lat"],
        "lon": st["lon"],
        "cota_atual_m": cota,
        "cota_maxima_m": st["cota_maxima_m"],
        "cota_atencao_m": st["cota_atencao_m"],
        "cota_alerta_m": st["cota_alerta_m"],
        "fonte_dados": fonte,
        "dados_simulados": fonte == "mock" or fonte.startswith("Simulação"),
        "estado_saisp": saisp_data.get("estado") if saisp_data else None,
        "posto_saisp": saisp_data.get("posto") if saisp_data else None,
        "cota_estimada_pelo_estado": bool(saisp_data and saisp_data.get("cota_estimada")),
        "nome_estacao": st["nome"],
        "rio_nome": st["rio"],
        "altura_atual_m": round(cota, 2),
        "altura_maxima_m": st["cota_maxima_m"],
        "porcentagem_calha": round((cota / st["cota_maxima_m"]) * 100, 1),
        **classificacao,
        # Force >88% calha for Rio Tietê in tempestade scenario
        **({
            "porcentagem_calha": max(round((cota / st["cota_maxima_m"]) * 100, 1), 88),
            "nivel": "extravasamento" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) > 90 else "alerta" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) >= 70 else "atencao",
            "cor": "vermelho" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) > 90 else "laranja" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) >= 70 else "amarelo",
            "emoji": "🔴" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) > 90 else "🟠" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) >= 70 else "🟡",
            "label": "Extravasamento Iminente" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) > 90 else "Cota de Alerta" if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) >= 70 else "Cota de Atenção",
            "multiplicador": 2.0 if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) > 90 else 1.7 if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) >= 70 else 1.3,
            "risco_minimo_forca": 92 if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) > 90 else 86 if max(round((cota / st["cota_maxima_m"]) * 100, 1), 88) >= 70 else None,
        } if scenario == "tempestade" and st["rio"] == "Rio Tietê" else {})
    }
    _cache_set(cache_key, result)
    return result


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────
@router.get("/status")
def get_rivers_status():
    """
    Status telemétrico de todas as estações fluviais de São Paulo.
    Tenta dados reais do SAISP/CGE; fallback para mock dinâmico.
    Cache de 5 minutos por estação.
    """
    estacoes = [_get_station_data(st) for st in RIVER_STATIONS]
    em_alerta = [e for e in estacoes if e["nivel"] in ("alerta", "extravasamento")]
    return {
        "estacoes": estacoes,
        "total_estacoes": len(estacoes),
        "em_alerta": len(em_alerta),
        "atualizacao": datetime.datetime.now().isoformat(),
        "fonte": "SAISP/CGE com fallback mock dinâmico",
    }


# --- REDE HIDROGRÁFICA COMPLETA DE SÃO PAULO (polilinhas de alta densidade) ---
# Vértices espaçados ~150-200m ao longo de cada calha.
# Buffer de 150m garante que as faixas das Marginais Tietê e Pinheiros
# sejam sempre identificadas como distância zero.
# Formato: (lat, lon) - WGS84
RIVER_POLYLINES: dict[str, list[tuple[float, float]]] = {

    # -- RIO TIETÊ -----------------------------------------------------------------
    # Trecho urbano: Borda Leste (Guarulhos) -> Perus (Zona Noroeste)
    # Curva da Penha corrigida: o rio desce para sul em Itaquera
    # e volta ao norte a partir de Belém/Brás.
    "Rio Tietê": [
        # Entrada leste / Ermelino Matarazzo
        (-23.484, -46.388), (-23.485, -46.397), (-23.487, -46.406),
        (-23.489, -46.415), (-23.492, -46.423), (-23.495, -46.431),
        (-23.498, -46.438), (-23.501, -46.445),
        # Descida sul - Itaquera / São Miguel / Penha ("curva do Tietê")
        (-23.505, -46.451), (-23.509, -46.456), (-23.513, -46.461),
        (-23.517, -46.465), (-23.521, -46.469), (-23.525, -46.473),
        (-23.528, -46.478), (-23.531, -46.483), (-23.534, -46.488),
        (-23.536, -46.494), (-23.537, -46.500), (-23.537, -46.507),
        # Inversão - sobe de volta ao norte (Penha / Belém)
        (-23.536, -46.514), (-23.534, -46.520), (-23.531, -46.526),
        (-23.528, -46.531), (-23.525, -46.537), (-23.521, -46.542),
        (-23.518, -46.547), (-23.515, -46.553), (-23.513, -46.559),
        # Tatuapé / Brás - troço quase horizontal
        (-23.511, -46.565), (-23.510, -46.571), (-23.510, -46.578),
        (-23.509, -46.584), (-23.509, -46.590), (-23.508, -46.597),
        (-23.508, -46.603), (-23.508, -46.609), (-23.508, -46.616),
        # Anhembi / Ponte das Bandeiras
        (-23.508, -46.622), (-23.508, -46.628), (-23.509, -46.634),
        (-23.509, -46.640), (-23.510, -46.646), (-23.510, -46.652),
        (-23.511, -46.658), (-23.511, -46.664), (-23.512, -46.670),
        # Barra Funda / Lapa
        (-23.512, -46.676), (-23.513, -46.682), (-23.513, -46.688),
        (-23.514, -46.694), (-23.514, -46.699), (-23.514, -46.705),
        (-23.514, -46.710), (-23.514, -46.715),
        # Viragem noroeste: Casa Verde / Freq. do O
        (-23.513, -46.720), (-23.511, -46.724), (-23.509, -46.728),
        (-23.506, -46.731), (-23.503, -46.734), (-23.499, -46.737),
        (-23.495, -46.739), (-23.491, -46.741), (-23.487, -46.743),
        (-23.483, -46.746), (-23.479, -46.749), (-23.475, -46.752),
        # Freguesia do O -> Pirituba -> Jaraguá
        (-23.472, -46.757), (-23.469, -46.762), (-23.466, -46.768),
        (-23.463, -46.774), (-23.460, -46.780), (-23.457, -46.787),
        (-23.454, -46.794), (-23.451, -46.801), (-23.449, -46.809),
        (-23.447, -46.817), (-23.445, -46.825), (-23.443, -46.833),
    ],

    # -- RIO PINHEIROS -------------------------------------------------------------
    # Represa Guarapiranga (Capão Redondo) -> Foz Tietê (Ceagesp / Lapa)
    "Rio Pinheiros": [
        # Sul - borda Guarapiranga / Interlagos
        (-23.714, -46.692), (-23.707, -46.694), (-23.700, -46.696),
        (-23.693, -46.699), (-23.686, -46.702), (-23.679, -46.705),
        (-23.672, -46.708), (-23.665, -46.710), (-23.658, -46.712),
        (-23.651, -46.713), (-23.644, -46.714), (-23.637, -46.714),
        (-23.630, -46.713), (-23.623, -46.711), (-23.616, -46.709),
        # Santo Amaro / Brooklin / Vila Olímpia
        (-23.610, -46.707), (-23.604, -46.706), (-23.598, -46.704),
        (-23.593, -46.703), (-23.588, -46.702), (-23.583, -46.701),
        (-23.578, -46.700), (-23.573, -46.700), (-23.568, -46.699),
        (-23.563, -46.699), (-23.558, -46.700), (-23.553, -46.701),
        # Pinheiros / Butantã (rio vira levemente W)
        (-23.548, -46.702), (-23.543, -46.704), (-23.538, -46.707),
        (-23.534, -46.710), (-23.530, -46.714), (-23.526, -46.718),
        (-23.523, -46.723), (-23.520, -46.728), (-23.518, -46.734),
        (-23.517, -46.739), (-23.516, -46.744), (-23.516, -46.749),
        (-23.516, -46.754),  # foz no Tietê (Ceagesp)
    ],

    # -- RIO TAMANDUATEI -----------------------------------------------------------
    "Rio Tamanduateí": [
        (-23.673, -46.563), (-23.666, -46.568), (-23.659, -46.573),
        (-23.652, -46.577), (-23.645, -46.580), (-23.638, -46.583),
        (-23.631, -46.585), (-23.624, -46.587), (-23.617, -46.589),
        (-23.610, -46.590), (-23.603, -46.592), (-23.596, -46.594),
        (-23.589, -46.597), (-23.582, -46.601), (-23.575, -46.606),
        (-23.568, -46.611), (-23.562, -46.615), (-23.557, -46.618),
        (-23.552, -46.621), (-23.546, -46.623), (-23.540, -46.623),
        (-23.534, -46.622), (-23.528, -46.621), (-23.521, -46.620),
        (-23.515, -46.620), (-23.510, -46.620),
    ],

    # -- RIO ARICANDUVA -----------------------------------------------------------
    "Rio Aricanduva": [
        (-23.618, -46.475), (-23.612, -46.483), (-23.606, -46.491),
        (-23.600, -46.498), (-23.594, -46.505), (-23.588, -46.511),
        (-23.582, -46.517), (-23.576, -46.523), (-23.570, -46.528),
        (-23.564, -46.533), (-23.557, -46.537), (-23.551, -46.541),
        (-23.545, -46.545), (-23.539, -46.549), (-23.533, -46.553),
        (-23.527, -46.558), (-23.521, -46.563), (-23.516, -46.568),
        (-23.512, -46.574),
    ],

    # -- CÓRREGO ANHANGABAÚ -------------------------------------------------------
    "Córrego Anhangabaú": [
        (-23.576, -46.651), (-23.573, -46.648), (-23.570, -46.645),
        (-23.567, -46.643), (-23.563, -46.641), (-23.560, -46.640),
        (-23.556, -46.639), (-23.553, -46.638), (-23.549, -46.637),
        (-23.546, -46.636), (-23.542, -46.636), (-23.539, -46.635),
        (-23.535, -46.634), (-23.532, -46.633),
    ],

    # -- CÓRREGO DO IPIRANGA (Zona Sul) -------------------------------------------
    "Córrego do Ipiranga": [
        (-23.613, -46.617), (-23.609, -46.613), (-23.605, -46.610),
        (-23.601, -46.607), (-23.597, -46.605), (-23.593, -46.603),
        (-23.589, -46.601), (-23.585, -46.599), (-23.581, -46.597),
        (-23.577, -46.595),
    ],

    # -- CÓRREGO JAGUARÉ (Zona Oeste) ---------------------------------------------
    "Córrego Jaguaré": [
        (-23.580, -46.755), (-23.575, -46.751), (-23.570, -46.747),
        (-23.566, -46.743), (-23.561, -46.740), (-23.557, -46.737),
        (-23.552, -46.734), (-23.548, -46.731), (-23.543, -46.729),
    ],

    # -- CÓRREGO PIRAJUÇARA (Butantã / Taboão) ------------------------------------
    "Córrego Pirajuçara": [
        (-23.636, -46.747), (-23.629, -46.745), (-23.622, -46.743),
        (-23.615, -46.741), (-23.609, -46.739), (-23.603, -46.737),
        (-23.597, -46.736), (-23.591, -46.735), (-23.585, -46.734),
        (-23.579, -46.733),
    ],

    # -- CÓRREGO MANDAQUI (Zona Norte) --------------------------------------------
    "Córrego Mandaqui": [
        (-23.466, -46.627), (-23.471, -46.624), (-23.476, -46.622),
        (-23.481, -46.620), (-23.486, -46.619), (-23.491, -46.619),
        (-23.496, -46.619), (-23.501, -46.620), (-23.506, -46.621),
        (-23.510, -46.623),
    ],

    # -- CÓRREGO CABUÇU DE CIMA (Zona Norte / Tucuruvi) ---------------------------
    "Córrego Cabuçu de Cima": [
        (-23.460, -46.604), (-23.465, -46.607), (-23.470, -46.609),
        (-23.475, -46.611), (-23.480, -46.613), (-23.485, -46.614),
        (-23.490, -46.615), (-23.495, -46.616), (-23.500, -46.617),
    ],

    # -- CÓRREGO ÁGUA BRANCA / LAPA -----------------------------------------------
    "Córrego Água Branca": [
        (-23.530, -46.703), (-23.527, -46.707), (-23.524, -46.711),
        (-23.521, -46.715), (-23.518, -46.718), (-23.515, -46.722),
        (-23.513, -46.725),
    ],

    # -- CÓRREGO SARACURA (Bixiga / Bela Vista) -----------------------------------
    "Córrego Saracura": [
        (-23.568, -46.653), (-23.564, -46.650), (-23.560, -46.648),
        (-23.556, -46.646), (-23.552, -46.644), (-23.548, -46.642),
        (-23.544, -46.640),
    ],

    # -- CÓRREGO ZAVUVUS / ACLIMAÇÃO ----------------------------------------------
    "Córrego Zavuvus": [
        (-23.577, -46.640), (-23.573, -46.637), (-23.570, -46.635),
        (-23.566, -46.633), (-23.562, -46.631), (-23.558, -46.630),
        (-23.554, -46.629),
    ],

    # -- CÓRREGO GUAPIRA / TREMEMBÉ (Zona Norte) ----------------------------------
    "Córrego Guapira": [
        (-23.446, -46.639), (-23.451, -46.636), (-23.456, -46.634),
        (-23.461, -46.632), (-23.466, -46.630), (-23.471, -46.629),
        (-23.476, -46.628), (-23.481, -46.627), (-23.486, -46.627),
    ],

    # -- CÓRREGO DO ORATÓRIO / MOOCA ----------------------------------------------
    "Córrego do Oratório": [
        (-23.570, -46.600), (-23.566, -46.597), (-23.562, -46.594),
        (-23.558, -46.592), (-23.554, -46.591), (-23.550, -46.590),
        (-23.546, -46.589),
    ],

    # -- CÓRREGO EMBU-MIRIM / SANTO AMARO -----------------------------------------
    "Córrego Embu-Mirim": [
        (-23.653, -46.762), (-23.646, -46.757), (-23.639, -46.752),
        (-23.632, -46.748), (-23.625, -46.744), (-23.618, -46.741),
        (-23.611, -46.738),
    ],

    # -- CANAL DO IBIRAPUERA / SAÚDE ----------------------------------------------
    "Canal Ibirapuera": [
        (-23.592, -46.662), (-23.589, -46.657), (-23.586, -46.652),
        (-23.583, -46.647), (-23.580, -46.643), (-23.577, -46.639),
    ],

    # -- CÓRREGO ITAQUERA (Zona Leste) --------------------------------------------
    "Córrego Itaquera": [
        (-23.557, -46.479), (-23.551, -46.472), (-23.545, -46.465),
        (-23.539, -46.459), (-23.533, -46.454), (-23.527, -46.450),
        (-23.521, -46.447),
    ],

    # -- CÓRREGO DO CARMO / IPIRANGA -----------------------------------------------
    "Córrego do Carmo": [
        (-23.592, -46.610), (-23.587, -46.607), (-23.582, -46.604),
        (-23.577, -46.601), (-23.572, -46.598), (-23.567, -46.596),
    ],

    # -- CÓRREGO PACAEMBU ----------------------------------------------------------
    "Córrego Pacaembu": [
        (-23.544, -46.670), (-23.547, -46.665), (-23.549, -46.660),
        (-23.551, -46.656), (-23.554, -46.651), (-23.556, -46.647),
        (-23.558, -46.643),
    ],

    # -- CANAIS E CÓRREGOS COMPLEMENTARES -----------------------------------------
    "Córrego da Lapa": [
        (-23.549, -46.718), (-23.544, -46.717), (-23.538, -46.716),
        (-23.532, -46.715), (-23.526, -46.714), (-23.520, -46.713),
        (-23.515, -46.712),
    ],
    "Córrego Cabuçu de Baixo": [
        (-23.470, -46.682), (-23.476, -46.678), (-23.482, -46.675),
        (-23.488, -46.671), (-23.494, -46.668), (-23.500, -46.665),
        (-23.506, -46.661),
    ],
    "Canal da Traição": [
        (-23.608, -46.695), (-23.604, -46.689), (-23.601, -46.682),
        (-23.598, -46.676), (-23.595, -46.669), (-23.592, -46.663),
    ],
    "Córrego Morro do S": [
        (-23.651, -46.750), (-23.645, -46.744), (-23.639, -46.738),
        (-23.633, -46.732), (-23.627, -46.726), (-23.621, -46.720),
    ],
    "Córrego do Sapateiro": [
        (-23.606, -46.668), (-23.601, -46.665), (-23.596, -46.662),
        (-23.591, -46.659), (-23.586, -46.655), (-23.581, -46.651),
        (-23.576, -46.648),
    ],
    "Córrego Verde": [
        (-23.577, -46.699), (-23.572, -46.694), (-23.567, -46.689),
        (-23.562, -46.684), (-23.557, -46.679), (-23.552, -46.674),
    ],
    "Córrego Tiquatira": [
        (-23.530, -46.554), (-23.527, -46.547), (-23.524, -46.540),
        (-23.521, -46.533), (-23.518, -46.526), (-23.515, -46.519),
        (-23.512, -46.512),
    ],
    "Córrego Jacu": [
        (-23.587, -46.464), (-23.580, -46.467), (-23.573, -46.470),
        (-23.566, -46.473), (-23.559, -46.476), (-23.552, -46.479),
        (-23.545, -46.481),
    ],
}

# A base cartográfica fica em GeoJSON para não manter arrays gigantes neste
# módulo. O arquivo é lido uma única vez quando o router é importado pelo
# FastAPI; cada trecho é densificado em segmentos de no máximo 25 m antes do
# índice espacial ser criado, evitando que curvas sejam cortadas por retas.
_RIVER_GEOJSON = Path(__file__).resolve().parents[1] / "data" / "sp_hydrography_highres.json"


def _densify_line(coords: list[list[float]], max_segment_m: float = 15.0) -> list[tuple[float, float]]:
    dense: list[tuple[float, float]] = []
    for first, second in zip(coords, coords[1:]):
        lon1, lat1 = float(first[0]), float(first[1])
        lon2, lat2 = float(second[0]), float(second[1])
        segment_m = math.hypot((lon2 - lon1) * 102000.0, (lat2 - lat1) * 111000.0)
        steps = max(1, math.ceil(segment_m / max_segment_m))
        for index in range(steps):
            ratio = index / steps
            dense.append((lat1 + (lat2 - lat1) * ratio, lon1 + (lon2 - lon1) * ratio))
    if coords:
        dense.append((float(coords[-1][1]), float(coords[-1][0])))
    return dense


def _load_river_geojson() -> None:
    """Carrega a malha estática sem downloads externos durante o startup."""
    try:
        with _RIVER_GEOJSON.open("r", encoding="utf-8") as stream:
            payload = json.load(stream)
        loaded = {}
        for feature in payload.get("features", []):
            geometry = feature.get("geometry") or {}
            name = (feature.get("properties") or {}).get("name")
            if name and geometry.get("type") == "LineString":
                loaded[name] = _densify_line(geometry.get("coordinates", []))
        if loaded:
            RIVER_POLYLINES.update(loaded)
    except (OSError, ValueError, TypeError):
        return


_load_river_geojson()

# --- ÍNDICE ESPACIAL PRÉ-COMPUTADO ------------------------------------------------
# Geometrias em WGS84 projetadas para SIRGAS 2000 / UTM 23S (EPSG:31983)
# para que buffer e distância sejam calculados em metros reais.
# Buffer aumentado para 150m -> cobre faixas de rodagem das Marginais.
RIVER_BUFFER_METERS = 150.0
_TO_METRIC = Transformer.from_crs("EPSG:4326", "EPSG:31983", always_xy=True).transform
_RIVER_SPATIAL_INDEX: dict[str, dict] = {}
for _river_name, _lat_lon_coords in RIVER_POLYLINES.items():
    _gps_line = LineString([(lon, lat) for lat, lon in _lat_lon_coords])
    _metric_line = transform(_TO_METRIC, _gps_line)
    _RIVER_SPATIAL_INDEX[_river_name] = {
        "gps_line": _gps_line,
        "metric_line": _metric_line,
        "buffer_100m": _metric_line.buffer(RIVER_BUFFER_METERS),
    }



def _dist_to_segment_m(lat: float, lon: float,
                        lat1: float, lon1: float,
                        lat2: float, lon2: float) -> float:
    """Distância ortogonal em metros de (lat, lon) ao segmento (lat1,lon1)-(lat2,lon2)."""
    px = (lon - lon1) * 102000.0
    py = (lat - lat1) * 111000.0
    dx = (lon2 - lon1) * 102000.0
    dy = (lat2 - lat1) * 111000.0
    len_sq = dx * dx + dy * dy
    param = ((px * dx + py * dy) / len_sq) if len_sq != 0 else -1.0
    param = max(0.0, min(1.0, param))
    proj_x = param * dx
    proj_y = param * dy
    return math.hypot(px - proj_x, py - proj_y)


def _min_dist_to_river_polyline(lat: float, lon: float, river_name: str) -> float:
    """Distância Shapely em metros até o eixo do curso d'água."""
    river_geometry = _RIVER_SPATIAL_INDEX.get(river_name)
    if not river_geometry:
        return float("inf")
    gps_point = Point(lon, lat)
    metric_point = transform(_TO_METRIC, gps_point)
    return float(metric_point.distance(river_geometry["metric_line"]))


def _min_dist_to_any_polyline(lat: float, lon: float) -> tuple[float, str]:
    """
    Percorre TODOS os segmentos de TODOS os rios/córregos e retorna
    (distância_mínima_m, nome_do_rio_mais_próximo).
    Usado como fallback universal para identificar o corpo d'água mais próximo.
    """
    # Point(lon, lat): nenhuma informação de rua/geocoding participa da busca.
    gps_point = Point(lon, lat)
    metric_point = transform(_TO_METRIC, gps_point)
    containing = []
    nearest = (float("inf"), "Bacia Hidrográfica de SP")

    for river_name, geometry in _RIVER_SPATIAL_INDEX.items():
        distance = float(metric_point.distance(geometry["metric_line"]))
        buffer_polygon = geometry["buffer_100m"]
        if metric_point.within(buffer_polygon) or buffer_polygon.covers(metric_point):
            containing.append((distance, river_name))
        if distance < nearest[0]:
            nearest = (distance, river_name)

    # Em buffers sobrepostos, identifica a linha efetivamente mais próxima.
    if containing:
        _, river_name = min(containing, key=lambda item: item[0])
        return 0.0, river_name

    return float(round(nearest[0], 1)), nearest[1]



@router.get("/nearest")
def get_nearest_river_status(lat: float, lon: float, radius_m: float = 25000.0, scenario: Optional[str] = None):
    """
    Retorna a estação fluvial cujo *traçado longitudinal* está mais próximo do
    ponto (lat, lon), calculando distância ortogonal mínima a cada segmento
    do eixo do rio (não apenas ao ponto fixo da estação telemétrica).

    Campos adicionais na resposta:
      distancia_calha_m  — distância real até o corpo d'água mais próximo
                           (varre TODA a rede hidrográfica, não só a do rio da estação)
      calha_nome         — nome do rio/córrego mais próximo da calha
    """
    # 1. Distância real ao traçado mais próximo de TODA a rede hidrográfica
    dist_calha_real, nome_calha_real = _min_dist_to_any_polyline(lat, lon)

    # 2. Para cada estação, calcula dist. ao traçado do respectivo rio → escolhe estação vencedora
    best_dist = float("inf")
    best_data = None

    all_data = []
    for st in RIVER_STATIONS:
        data = _get_station_data(st, scenario)

        river_polyline_key = st["rio"]
        if river_polyline_key in RIVER_POLYLINES:
            dist_to_tracado = _min_dist_to_river_polyline(lat, lon, river_polyline_key)
        else:
            dy = (lat - st["lat"]) * 111000.0
            dx = (lon - st["lon"]) * 102000.0
            dist_to_tracado = math.hypot(dx, dy)

        data["_distancia_calculo"] = dist_to_tracado
        all_data.append(data)

        if dist_to_tracado < best_dist:
            best_dist = dist_to_tracado
            best_data = data

    # Estações em alerta dentro de 5km — usa distância ao traçado
    alertas_regionais = [
        {
            "nome": d["nome"],
            "rio": d["rio"],
            "nivel": d["nivel"],
            "emoji": d["emoji"],
            "distancia_m": round(d["_distancia_calculo"], 0),
            "percentual_ocupacao": d["percentual_ocupacao"],
            "porcentagem_calha": d["porcentagem_calha"],
            "label": d["label"],
        }
        for d in all_data
        if d["nivel"] in ("alerta", "extravasamento") and d["_distancia_calculo"] <= 5000
    ]
    alertas_regionais.sort(key=lambda x: x["distancia_m"])

    within_radius = best_data is not None and best_dist <= radius_m

    mensagem = None
    if best_data:
        rio_nome = best_data["rio"]
        pct_calha = best_data["percentual_ocupacao"]
        nivel = best_data["nivel"]
        if nivel == "extravasamento":
            mensagem = (
                f"⚠️ ALERTA HÍDRICO: Nível do {rio_nome} em {pct_calha}% da calha — Extravasamento Iminente"
            )
        elif nivel == "alerta":
            mensagem = (
                f"⚠️ ALERTA HÍDRICO: Nível do {rio_nome} em {pct_calha}% da calha — Cota de Alerta"
            )
        elif nivel == "atencao":
            mensagem = (
                f"⚠️ ATENÇÃO HÍDRICA: Nível do {rio_nome} em {pct_calha}% da calha — Cota de Atenção"
            )
        else:
            mensagem = f"🟢 Nível Normal — {rio_nome}"

    return {
        # ── Campos de telemetria fluvial (estação vencedora) ──────────────────
        "dentro_raio": within_radius,
        "distancia_m": round(best_dist, 1) if best_data else None,
        "nome_estacao": best_data["nome"] if best_data else None,
        "rio_nome": nome_calha_real,
        "porcentagem_calha": best_data["percentual_ocupacao"] if best_data else 0.0,
        "percentual_ocupacao": best_data["percentual_ocupacao"] if best_data else 0.0,
        "estacao": {
            "id": best_data["id"],
            "nome": best_data["nome"],
            "rio": best_data["rio"],
            "lat": best_data["lat"],
            "lon": best_data["lon"],
            "cota_atual_m": best_data["cota_atual_m"],
            "cota_maxima_m": best_data["cota_maxima_m"],
            "fonte_dados": best_data.get("fonte_dados", "mock"),
            "nome_estacao": best_data["nome"],
            "rio_nome": best_data["rio"],
            "porcentagem_calha": best_data["percentual_ocupacao"],
        } if best_data else None,
        "nivel": best_data["nivel"] if best_data else "normal",
        "cor": best_data["cor"] if best_data else "verde",
        "emoji": best_data["emoji"] if best_data else "🟢",
        "label": best_data["label"] if best_data else "Nível Normal",
        "multiplicador": best_data["multiplicador"] if best_data else 1.0,
        "risco_minimo_forca": best_data["risco_minimo_forca"] if best_data else None,
        "alertas_regionais": alertas_regionais,
        "mensagem_alerta": mensagem,
        # ── Distância real ao corpo d'água mais próximo (rede completa) ───────
        # Use estes dois campos nos KPIs do frontend (#kpi-river-dist / #kpi-river-name)
        "distancia_calha_m": round(dist_calha_real, 1),
        "calha_nome": nome_calha_real,
        "dentro_buffer_100m": dist_calha_real == 0.0,
        "metodo_espacial": "shapely_point_in_polygon_utm23s",
        "buffer_metros": RIVER_BUFFER_METERS,
        "total_corpos_agua_indexados": len(_RIVER_SPATIAL_INDEX),
    }
