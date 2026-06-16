from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"), nullable=True)
    tipo = Column(String(50)) # info, warning, critical
    titulo = Column(String(255))
    mensagem = Column(Text)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)

    zone = relationship("RiskZone", back_populates="alerts")
