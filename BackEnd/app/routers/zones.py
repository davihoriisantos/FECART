from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import math
from ..database import get_db
from ..models.zone import RiskZone
from ..models.flood_event import DynamicFloodEvent
from ..schemas.zone import (
    RiskZoneResponse, 
    HeatmapPoint, 
    SpatialQueryResponse, 
    SpatialRecordItem, 
    BasinFallbackInfo
)
from ..schemas.flood_event import FloodEventResponse, SyncResultResponse, ChronicMatrixResponse
from ..services.prediction_service import update_all_zones_risk
from ..services.cge_crawler import sync_cge_floods
from ..services.risk_matrix_service import get_chronic_risk_matrix

router = APIRouter(prefix="/api/zones", tags=["zones"])

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula a distância euclidiana projetada métrica calibrada para São Paulo."""
    dy = (lat1 - lat2) * 111000.0
    dx = (lon1 - lon2) * 102000.0
    return math.hypot(dx, dy)

def get_sp_basin_fallback(lat: float, lon: float) -> BasinFallbackInfo:
    """Classifica dinamicamente qualquer coordenada de São Paulo em sua macrozona/bacia hidrográfica."""
    # 1. Eixo Marginal Tietê (Calha central de várzea baixa)
    if -23.535 <= lat <= -23.500 and -46.750 <= lon <= -46.500:
        return BasinFallbackInfo(
            zona_geografica="Eixo Marginal Tietê",
            bacia_hidrografica="Calha do Rio Tietê",
            probabilidade_base=68.0,
            vulnerabilidade_relevo="Várzea fluvial contínua com cota baixa (715-722m) e alto risco de represamento.",
            descricao="Região de planície aluvial altamente impermeabilizada da calha do Tietê com sensibilidade hidrológica severa."
        )

    # 2. Eixo Marginal Pinheiros
    if -23.700 <= lat <= -23.525 and -46.745 <= lon <= -46.680:
        return BasinFallbackInfo(
            zona_geografica="Eixo Marginal Pinheiros",
            bacia_hidrografica="Calha do Rio Pinheiros",
            probabilidade_base=64.0,
            vulnerabilidade_relevo="Vale aluvial plano com drenagem dependente do nível do Rio Pinheiros e estações de bombeamento.",
            descricao="Corredor expressivo de drenagem urbana sob influência de confluências com Jaguaré, Pirajuçara e Água Espraiada."
        )

    # 3. Centro Histórico & Fundo de Vale do Tamanduateí
    if -23.568 <= lat <= -23.535 and -46.650 <= lon <= -46.615:
        return BasinFallbackInfo(
            zona_geografica="Centro Histórico / Bacia Central",
            bacia_hidrografica="Bacia do Tamanduateí / Anhangabaú",
            probabilidade_base=58.0,
            vulnerabilidade_relevo="Fundos de vale urbanos centrais com galerias pluviais históricas e vertentes íngremes.",
            descricao="Macroárea com convergência de enxurradas da Liberdade, Bela Vista e Sé em direção ao Anhangabaú e Tamanduateí."
        )

    # 4. Zona Leste (Bacias Aricanduva, Córrego da Mooca, Tietê Leste)
    if lon > -46.600:
        if lat <= -23.570:
            return BasinFallbackInfo(
                zona_geografica="Zona Leste (Sudeste / Vila Prudente / Mooca)",
                bacia_hidrografica="Sub-bacia Córrego da Mooca / Oratório",
                probabilidade_base=60.0,
                vulnerabilidade_relevo="Planície intermediária com histórico de refluxo em pontes e vias arteriais como Anhaia Mello.",
                descricao="Bacia com adensamento urbano contínuo e histórico de retenção hídrica em episódios convectivos."
            )
        else:
            return BasinFallbackInfo(
                zona_geografica="Zona Leste (Aricanduva / Itaquera / Penha)",
                bacia_hidrografica="Bacia do Rio Aricanduva / Tietê Leste",
                probabilidade_base=62.0,
                vulnerabilidade_relevo="Extensas planícies de inundação com histórico crítico da calha do Aricanduva.",
                descricao="Maior bacia da Zona Leste com rápida concentração de cheias e dependência de piscinões de retenção."
            )

    # 5. Zona Norte (Mandaqui, Santana, Cabuçu, Cantareira)
    if lat > -23.515:
        return BasinFallbackInfo(
            zona_geografica="Zona Norte (Cantareira / Mandaqui / Tremembé)",
            bacia_hidrografica="Bacia Cabuçu de Cima / Mandaqui",
            probabilidade_base=52.0,
            vulnerabilidade_relevo="Transição de vertentes serranas íngremes para as planícies receptoras do Tietê Norte.",
            descricao="Região com rápida descida de enxurradas pluviais e canalizações em avenidas de fundo de vale."
        )

    # 6. Zona Sul (Ipiranga, Brooklin, Santo Amaro, Zavuvus, Represas)
    if lat < -23.585:
        return BasinFallbackInfo(
            zona_geografica="Zona Sul (Ipiranga / Brooklin / Santo Amaro)",
            bacia_hidrografica="Bacia Ipiranga / Zavuvus / Pinheirinho",
            probabilidade_base=56.0,
            vulnerabilidade_relevo="Vales encaixados e bacias com histórico de transbordamento de córregos retificados.",
            descricao="Bacias do planalto sul paulistano com retenções frequentes em cruzamentos da Av. Bandeirantes, Jafet e Santo Amaro."
        )

    # 7. Zona Oeste (Lapa, Pompeia, Perdizes, Butantã)
    if lon < -46.660:
        return BasinFallbackInfo(
            zona_geografica="Zona Oeste (Pompeia / Perdizes / Butantã)",
            bacia_hidrografica="Bacia Água Preta / Sumaré / Pirajuçara",
            probabilidade_base=54.0,
            vulnerabilidade_relevo="Colinas onduladas com vales profundos de canalização pluvial acelerada.",
            descricao="Vertentes de alto gradiente topográfico que concentram volume d'água na Av. Pompeia e proximidades da Lapa."
        )

    # 8. Planalto Metropolitano de São Paulo (Cobertura Universal Geral)
    return BasinFallbackInfo(
        zona_geografica="Planalto Metropolitano de São Paulo",
        bacia_hidrografica="Alto Tietê / Rede Hidrográfica Geral",
        probabilidade_base=40.0,
        vulnerabilidade_relevo="Topografia de colinas suaves do planalto atlântico com drenagem urbana padrão.",
        descricao="Área sob regime hidrológico geral do planalto de São Paulo monitorada continuamente pelo CGE e Defesa Civil."
    )

@router.get("/spatial-query", response_model=SpatialQueryResponse)
def query_spatial_risk(
    lat: float = Query(..., description="Latitude do ponto em análise"),
    lon: float = Query(..., description="Longitude do ponto em análise"),
    radius: float = Query(1000.0, description="Raio de busca geoespacial em metros (padrão: 1000m)"),
    db: Session = Depends(get_db)
):
    """
    Consulta geoespacial com cobertura de 100% de São Paulo:
    1. Busca registros históricos da Defesa Civil / CGE a até 'radius' metros do ponto exato.
    2. Se houver registros num raio de 1.000m: calcula a influência espacial e lista os pontos.
    3. Se não houver registro a até 1.000m: aciona o Fallback Dinâmico de Histórico por Bacia/Macrozona de SP.
    """
    zones = db.query(RiskZone).all()
    
    records_within_radius: List[SpatialRecordItem] = []
    nearest_record: Optional[SpatialRecordItem] = None
    min_distance = float('inf')

    for zone in zones:
        dist = calculate_distance_meters(lat, lon, zone.latitude_centro, zone.longitude_centro)
        
        item = SpatialRecordItem(
            id=zone.id,
            nome=zone.nome,
            latitude=zone.latitude_centro,
            longitude=zone.longitude_centro,
            distancia_metros=round(dist, 1),
            nivel_risco=zone.nivel_risco,
            probabilidade_enchente=zone.probabilidade_enchente,
            raio_metros=zone.raio_metros,
            descricao=zone.descricao
        )

        if dist < min_distance:
            min_distance = dist
            nearest_record = item

        if dist <= radius:
            records_within_radius.append(item)

    # Ordena os pontos por proximidade
    records_within_radius.sort(key=lambda x: x.distancia_metros)

    # Fallback dinâmico por bacia hidrográfica/zona de SP
    basin_fallback = get_sp_basin_fallback(lat, lon)

    # Cálculo da influência histórica contínua (0.0 a 1.0)
    has_records = len(records_within_radius) > 0
    if has_records and nearest_record:
        # Decaimento espacial contínuo dentro do raio de 1000 metros
        dist_factor = max(0.0, 1.0 - (nearest_record.distancia_metros / radius))
        severity_weight = (nearest_record.probabilidade_enchente / 100.0)
        calculated_influence = round(dist_factor * severity_weight, 3)
    else:
        # Influência do padrão histórico da bacia/zona geográfica
        calculated_influence = round((basin_fallback.probabilidade_base / 100.0) * 0.45, 3)

    return SpatialQueryResponse(
        latitude=lat,
        longitude=lon,
        radius_meters=radius,
        has_records_within_radius=has_records,
        nearest_record=nearest_record,
        records_within_radius=records_within_radius,
        basin_fallback=basin_fallback,
        calculated_historical_influence=calculated_influence
    )

@router.get("", response_model=List[RiskZoneResponse])
def get_zones(db: Session = Depends(get_db)):
    return db.query(RiskZone).all()

@router.get("/heatmap", response_model=List[HeatmapPoint])
def get_heatmap(db: Session = Depends(get_db)):
    zones = db.query(RiskZone).all()
    points = []
    for zone in zones:
        points.append(HeatmapPoint(
            latitude=zone.latitude_centro,
            longitude=zone.longitude_centro,
            intensity=zone.probabilidade_enchente / 100.0
        ))
    return points

@router.get("/live-occurrences", response_model=List[FloodEventResponse])
def get_live_occurrences(
    apenas_ativos: bool = Query(False, description="Filtrar apenas alagamentos ativos no momento"),
    db: Session = Depends(get_db)
):
    """
    Retorna as ocorrências de alagamento registradas dinamicamente pelo CGE / Defesa Civil.
    Prioriza o Supabase com fallback seguro para a tabela SQLite local.
    """
    # 1. Tenta buscar no Supabase
    try:
        from ..supabase_client import get_supabase
        sb = get_supabase()
        if sb:
            query = sb.table("dynamic_flood_events").select("*").order("data_evento", desc=True)
            if apenas_ativos:
                query = query.like("status", "%ativo%")
            res = query.limit(50).execute()
            if res.data and len(res.data) > 0:
                return res.data
    except Exception as e:
        print(f"[Zones] Supabase query fallback to local: {e}")

    # 2. Fallback: Banco local SQLite
    query = db.query(DynamicFloodEvent).order_by(DynamicFloodEvent.criado_em.desc())
    if apenas_ativos:
        query = query.filter(DynamicFloodEvent.status.like("%ativo%"))
    return query.limit(50).all()


@router.post("/sync-cge", response_model=SyncResultResponse)
def trigger_cge_sync(
    data_busca: Optional[str] = Query(None, description="Data opcional (AAAA-MM-DD ou DD/MM/AAAA)"),
    db: Session = Depends(get_db)
):
    """
    Dispara a raspagem e geocodificação dos alagamentos oficiais do CGE SP.
    Salva novos pontos no banco de dados e no Supabase.
    """
    result = sync_cge_floods(target_date=data_busca, db=db)
    return SyncResultResponse(**result)


@router.get("/chronic-matrix-2y", response_model=ChronicMatrixResponse)
def get_chronic_matrix_2y(
    raio_cluster_m: float = Query(500.0, description="Raio em metros para agrupamento geográfico de enchentes (padrão: 500m)"),
    db: Session = Depends(get_db)
):
    """
    MATRIZ DE RISCO HISTÓRICO (JANELA DINÂMICA DE 2 ANOS):
    - Filtra eventos onde data_evento >= hoje - 2 anos
    - Agrupa por proximidade espacial (raio de 500m / logradouro)
    - Classifica o risco automaticamente:
        * 5+ alagamentos: Risco Extremo (Crítico) - #7F1D1D
        * 3 a 4 alagamentos: Risco Alto - #DC2626
        * 1 a 2 alagamentos: Risco Moderado - #F59E0B
    """
    from datetime import date, timedelta
    hoje = date.today()
    data_inicio = hoje - timedelta(days=730)

    clusters = get_chronic_risk_matrix(db=db, cluster_radius_m=raio_cluster_m)

    total_ocorrencias = sum(c["total_ocorrencias"] for c in clusters)
    zonas_criticas = sum(1 for c in clusters if c["nivel_risco"] == "critico")
    zonas_altas = sum(1 for c in clusters if c["nivel_risco"] == "alto")
    zonas_moderadas = sum(1 for c in clusters if c["nivel_risco"] == "moderado")

    return ChronicMatrixResponse(
        periodo_analise="2 Anos Dinâmico (24 meses)",
        data_inicio=data_inicio.isoformat(),
        data_fim=hoje.isoformat(),
        total_clusters=len(clusters),
        total_ocorrencias_periodo=total_ocorrencias,
        zonas_criticas=zonas_criticas,
        zonas_altas=zonas_altas,
        zonas_moderadas=zonas_moderadas,
        clusters=clusters
    )


@router.get("/{zone_id}", response_model=RiskZoneResponse)
def get_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(RiskZone).filter(RiskZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona não encontrada")
    return zone


@router.post("/update-risks")
def update_risks(db: Session = Depends(get_db)):
    update_all_zones_risk(db)
    return {"message": "Riscos atualizados com sucesso"}

