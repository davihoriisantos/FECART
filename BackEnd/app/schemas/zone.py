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
