from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HistoricoBuscaCreate(BaseModel):
    """Campos que o frontend envia ao criar histórico."""
    termo_busca:      str            # mapeado para query_text no Supabase
    lat:              Optional[float] = None
    lon:              Optional[float] = None
    bairro:           Optional[str] = None   # ignorado (col. não existe no Supabase)
    dados_adicionais: Optional[str] = None   # ignorado (col. não existe no Supabase)


class HistoricoBuscaOut(BaseModel):
    """
    Resposta enviada ao frontend.
    Os nomes dos campos seguem a convenção antiga para não quebrar o JS existente.
    Internamente são mapeados das colunas reais do Supabase.
    """
    id:               int
    usuario_id:       int            # Supabase: user_id
    termo_busca:      str            # Supabase: query_text
    lat:              Optional[float] = None
    lon:              Optional[float] = None
    bairro:           Optional[str] = None   # não existe no Supabase → None
    dados_adicionais: Optional[str] = None   # não existe no Supabase → None
    criado_em:        datetime       # Supabase: created_at

    class Config:
        from_attributes = True
