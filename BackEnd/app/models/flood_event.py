from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from datetime import datetime, timezone, date
from ..database import Base

class DynamicFloodEvent(Base):
    __tablename__ = "dynamic_flood_events"

    id = Column(Integer, primary_key=True, index=True)
    bairro = Column(String(120), nullable=False)
    logradouro = Column(String(255), nullable=False)
    referencia = Column(String(255), nullable=True)
    sentido = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)  # 'ativo_intransitavel', 'ativo_transitavel', 'inativo', etc.
    horario_inicio = Column(String(20), nullable=True)
    horario_fim = Column(String(20), nullable=True)
    data_evento = Column(Date, default=date.today, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    fonte = Column(String(50), default="CGE_SP")
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
