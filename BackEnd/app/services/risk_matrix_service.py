"""
FloodGuard AI — Motor da Matriz de Risco Histórico (Janela de 2 Anos)
Regras de Negócio:
1. Filtro Temporal Dinâmico: ocorrências onde data_evento >= hoje - 2 anos
2. Spatial Clustering: Agrupamento geográfico em raio de 500 metros
3. Classificação Automática:
   - 5+ ocorrências: Risco Extremo (Crítico) - #7F1D1D
   - 3 a 4 ocorrências: Risco Alto - #DC2626
   - 1 a 2 ocorrências: Risco Moderado - #F59E0B
"""
import math
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.flood_event import DynamicFloodEvent


def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula a distância euclidiana projetada métrica calibrada para São Paulo."""
    dy = (lat1 - lat2) * 111000.0
    dx = (lon1 - lon2) * 102000.0
    return math.hypot(dx, dy)


def classify_risk(count: int) -> Dict[str, str]:
    """Aplica as tags e cores da matriz de risco conforme a regra de negócio."""
    if count >= 5:
        return {
            "nivel_risco": "critico",
            "tag_risco": "Risco Extremo (Crítico)",
            "cor_hex": "#7F1D1D",  # Vermelho escuro
            "descricao_risco": "Área de Risco Extremo: 5 ou mais alagamentos registrados nos últimos 2 anos."
        }
    elif count >= 3:
        return {
            "nivel_risco": "alto",
            "tag_risco": "Risco Alto",
            "cor_hex": "#DC2626",  # Vermelho
            "descricao_risco": "Área de Risco Alto: 3 a 4 alagamentos registrados nos últimos 2 anos."
        }
    else:
        return {
            "nivel_risco": "moderado",
            "tag_risco": "Risco Moderado",
            "cor_hex": "#F59E0B",  # Âmbar / Amarelo
            "descricao_risco": "Área de Risco Moderado: 1 a 2 alagamentos registrados nos últimos 2 anos."
        }


def get_chronic_risk_matrix(db: Optional[Session] = None, cluster_radius_m: float = 500.0) -> List[Dict[str, Any]]:
    """
    Executa a análise histórica dos últimos 2 anos com clustering espacial de 500 metros.
    Prioriza consulta direta ao Supabase com fallback para a base local.
    """
    hoje = date.today()
    data_limite = hoje - timedelta(days=730)  # Exatos 2 anos atrás
    data_limite_iso = data_limite.isoformat()

    raw_events = []

    # 1. Tenta carregar eventos do Supabase
    try:
        from ..supabase_client import get_supabase
        sb = get_supabase()
        if sb:
            res = sb.table("dynamic_flood_events")\
                    .select("*")\
                    .gte("data_evento", data_limite_iso)\
                    .not_.is_("latitude", "null")\
                    .not_.is_("longitude", "null")\
                    .execute()
            if res.data and len(res.data) > 0:
                raw_events = res.data
    except Exception as e:
        print(f"[RiskMatrix] Supabase fallback: {e}")

    # 2. Fallback: Banco local SQLite se Supabase não tiver retornado
    if not raw_events and db:
        local_records = db.query(DynamicFloodEvent).filter(
            DynamicFloodEvent.data_evento >= data_limite,
            DynamicFloodEvent.latitude.isnot(None),
            DynamicFloodEvent.longitude.isnot(None)
        ).all()

        for rec in local_records:
            raw_events.append({
                "id": str(rec.id),
                "bairro": rec.bairro,
                "logradouro": rec.logradouro,
                "referencia": rec.referencia,
                "sentido": rec.sentido,
                "status": rec.status,
                "data_evento": rec.data_evento.isoformat() if rec.data_evento else hoje.isoformat(),
                "latitude": rec.latitude,
                "longitude": rec.longitude,
                "fonte": rec.fonte or "CGE_SP"
            })

    # Se não houver alagamentos cadastrados nos últimos 2 anos, retorna vazio
    if not raw_events:
        return []

    # 3. Algoritmo de Clustering Espacial (Raio de 500 metros)
    clusters: List[Dict[str, Any]] = []

    for ev in raw_events:
        lat = float(ev["latitude"])
        lon = float(ev["longitude"])

        matched_cluster = None
        for cl in clusters:
            dist = calculate_distance_meters(lat, lon, cl["latitude_centro"], cl["longitude_centro"])
            # Agrupa se estiver no raio de 500m OU mesmo logradouro e bairro
            same_street = (ev.get("logradouro", "").lower().strip() == cl["logradouro_principal"].lower().strip() and
                           ev.get("bairro", "").lower().strip() == cl["bairro"].lower().strip())

            if dist <= cluster_radius_m or same_street:
                matched_cluster = cl
                break

        if matched_cluster:
            matched_cluster["total_ocorrencias"] += 1
            matched_cluster["eventos"].append({
                "data": ev.get("data_evento"),
                "status": ev.get("status"),
                "logradouro": ev.get("logradouro")
            })
            if "intransitavel" in (ev.get("status") or ""):
                matched_cluster["total_intransitavel"] += 1
            else:
                matched_cluster["total_transitavel"] += 1

            # Recalcula centroide ponderado do cluster
            n = matched_cluster["total_ocorrencias"]
            matched_cluster["latitude_centro"] = round((matched_cluster["latitude_centro"] * (n - 1) + lat) / n, 6)
            matched_cluster["longitude_centro"] = round((matched_cluster["longitude_centro"] * (n - 1) + lon) / n, 6)

            # Atualiza data mais recente
            if ev.get("data_evento") and ev["data_evento"] > matched_cluster["ultima_ocorrencia"]:
                matched_cluster["ultima_ocorrencia"] = ev["data_evento"]
        else:
            is_intransitavel = "intransitavel" in (ev.get("status") or "")
            clusters.append({
                "cluster_id": f"cl_{len(clusters) + 1}",
                "bairro": ev.get("bairro", "São Paulo"),
                "logradouro_principal": ev.get("logradouro", ""),
                "referencia": ev.get("referencia", ""),
                "latitude_centro": round(lat, 6),
                "longitude_centro": round(lon, 6),
                "raio_metros": cluster_radius_m,
                "total_ocorrencias": 1,
                "total_intransitavel": 1 if is_intransitavel else 0,
                "total_transitavel": 0 if is_intransitavel else 1,
                "primeira_ocorrencia": ev.get("data_evento", hoje.isoformat()),
                "ultima_ocorrencia": ev.get("data_evento", hoje.isoformat()),
                "eventos": [{
                    "data": ev.get("data_evento"),
                    "status": ev.get("status"),
                    "logradouro": ev.get("logradouro")
                }]
            })

    # 4. Aplica as regras de classificação em cada cluster
    result = []
    for cl in clusters:
        risk_meta = classify_risk(cl["total_ocorrencias"])
        cl.update(risk_meta)
        result.append(cl)

    # Ordena da área de maior risco para a de menor risco
    result.sort(key=lambda x: x["total_ocorrencias"], reverse=True)
    return result
