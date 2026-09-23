from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HistoricoBuscaCreate(BaseModel):
    termo_busca: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    bairro: Optional[str] = None
    dados_adicionais: Optional[str] = None

class HistoricoBuscaOut(BaseModel):
    id: int
    usuario_id: int
    termo_busca: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    bairro: Optional[str] = None
    dados_adicionais: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True
