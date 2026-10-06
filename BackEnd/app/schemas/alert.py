from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class AlertBase(BaseModel):
    zone_id: Optional[int] = None
    tipo: str
    titulo: str
    mensagem: str
    expires_at: Optional[datetime] = None

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    ativo: Optional[bool] = None
    tipo: Optional[str] = None

class AlertResponse(AlertBase):
    id: int
    ativo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
