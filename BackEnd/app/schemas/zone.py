from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RiskZoneBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    latitude_centro: float
    longitude_centro: float
    raio_metros: float
    nivel_risco: str
    probabilidade_enchente: float
    populacao_afetada: int
    polygon_coords: str

class RiskZoneCreate(RiskZoneBase):
    pass

class RiskZoneResponse(RiskZoneBase):
    id: int
    ultima_atualizacao: datetime

    class Config:
        from_attributes = True

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    intensity: float

class SpatialRecordItem(BaseModel):
    id: int
    nome: str
    latitude: float
    longitude: float
    distancia_metros: float
    nivel_risco: str
    probabilidade_enchente: float
    raio_metros: float
    descricao: Optional[str] = None

class BasinFallbackInfo(BaseModel):
    zona_geografica: str
    bacia_hidrografica: str
    probabilidade_base: float
    vulnerabilidade_relevo: str
    descricao: str

class SpatialQueryResponse(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float
    has_records_within_radius: bool
    nearest_record: Optional[SpatialRecordItem] = None
    records_within_radius: list[SpatialRecordItem] = []
    basin_fallback: BasinFallbackInfo
    calculated_historical_influence: float # 0.0 a 1.0

