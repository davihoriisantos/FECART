from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..database import Base

class RiskZone(Base):
    __tablename__ = "risk_zones"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255))
    descricao = Column(String(500))
    latitude_centro = Column(Float)
    longitude_centro = Column(Float)
    raio_metros = Column(Float)
    nivel_risco = Column(String(50)) # baixo, moderado, alto, critico
    probabilidade_enchente = Column(Float) # 0-100
    populacao_afetada = Column(Integer)
    ultima_atualizacao = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    polygon_coords = Column(Text) # JSON string of polygon coordinates

    alerts = relationship("Alert", back_populates="zone")
