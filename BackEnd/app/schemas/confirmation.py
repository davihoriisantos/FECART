from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Dict

class ConfirmationCreate(BaseModel):
    point_id: str

class ConfirmationResponse(BaseModel):
    id: int
    point_id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class ConfirmationCounts(BaseModel):
    counts: Dict[str, int]
