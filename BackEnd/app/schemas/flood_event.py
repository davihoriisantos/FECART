from pydantic import BaseModel, ConfigDict
from typing import Optional, Union, Any, List
from datetime import date, datetime

class FloodEventBase(BaseModel):
    bairro: str
    logradouro: str
    referencia: Optional[str] = None
    sentido: Optional[str] = None
    status: str
    horario_inicio: Optional[str] = None
    horario_fim: Optional[str] = None
    data_evento: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    fonte: str = "CGE_SP"

class FloodEventCreate(FloodEventBase):
    pass

class FloodEventResponse(FloodEventBase):
    id: Optional[Union[str, int]] = None
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SyncResultResponse(BaseModel):
    sucesso: bool
    mensagem: str
    total_encontrados: int
    total_novos: int
    total_ativos: int
    data_consulta: str


class ChronicClusterItem(BaseModel):
    cluster_id: str
    bairro: str
    logradouro_principal: str
    referencia: Optional[str] = None
    latitude_centro: float
    longitude_centro: float
    raio_metros: float
    total_ocorrencias: int
    contagem: Optional[int] = None
    total_intransitavel: int
    total_transitavel: int
    primeira_ocorrencia: Optional[str] = None
    ultima_ocorrencia: Optional[str] = None
    nivel_risco: str  # 'critico', 'alto', 'moderado'
    tag_risco: str    # 'Risco Extremo (Crítico)', 'Risco Alto', 'Risco Moderado'
    cor_hex: str      # '#7F1D1D', '#DC2626', '#F59E0B'
    descricao_risco: str
    eventos: Optional[List[Any]] = None


class ChronicMatrixResponse(BaseModel):
    periodo_analise: str
    data_inicio: str
    data_fim: str
    total_clusters: int
    total_ocorrencias_periodo: int
    zonas_criticas: int
    zonas_altas: int
    zonas_moderadas: int
    clusters: List[ChronicClusterItem]
