from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class SensorReadingBase(BaseModel):
    valor: float
    unidade: str

class SensorReadingCreate(SensorReadingBase):
    pass

class SensorReadingResponse(SensorReadingBase):
    id: int
    sensor_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class SensorBase(BaseModel):
    nome: str
    tipo: str
    latitude: float
    longitude: float
    descricao: Optional[str] = None
    status: Optional[str] = 'ativo'

class SensorCreate(SensorBase):
    pass

class SensorResponse(SensorBase):
    id: int
    created_at: datetime
    # readings count could be added if needed, or fetched separately

    class Config:
        from_attributes = True
