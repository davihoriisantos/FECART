from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..database import Base

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255))
    tipo = Column(String(100)) # pluviometro, nivel_rio, umidade_solo
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String(50), default='ativo')
    descricao = Column(String(500))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"))
    valor = Column(Float)
    unidade = Column(String(50))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sensor = relationship("Sensor", back_populates="readings")
