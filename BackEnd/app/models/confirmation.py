from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from ..database import Base

class Confirmation(Base):
    __tablename__ = "confirmations"

    id = Column(Integer, primary_key=True, index=True)
    point_id = Column(String(50), index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
