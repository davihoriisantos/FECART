from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime, timezone
from ..database import Base

class HistoricoBuscaRegiao(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    termo_busca = Column(String(255), nullable=False)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    bairro = Column(String(255), nullable=True)
    dados_adicionais = Column(String(500), nullable=True)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))
