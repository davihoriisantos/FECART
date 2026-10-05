from pydantic import BaseModel
from typing import Optional, Union, Any
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

    class Config:
        from_attributes = True

class SyncResultResponse(BaseModel):
    sucesso: bool
    mensagem: str
    total_encontrados: int
    total_novos: int
    total_ativos: int
    data_consulta: str
