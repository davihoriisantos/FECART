from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from ..database import get_db
from ..models.confirmation import Confirmation
from ..schemas.confirmation import ConfirmationResponse, ConfirmationCounts

router = APIRouter(prefix="/api/confirmations", tags=["confirmations"])

@router.post("/{point_id}", response_model=ConfirmationResponse)
def create_confirmation(point_id: str, db: Session = Depends(get_db)):
    db_conf = Confirmation(point_id=point_id)
    db.add(db_conf)
    db.commit()
    db.refresh(db_conf)
    return db_conf

@router.get("/counts", response_model=ConfirmationCounts)
def get_confirmation_counts(hours: int = 6, db: Session = Depends(get_db)):
    time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Query to count confirmations grouped by point_id in the last 'hours'
    results = db.query(
        Confirmation.point_id, 
        func.count(Confirmation.id).label('count')
    ).filter(
        Confirmation.timestamp >= time_threshold
    ).group_by(
        Confirmation.point_id
    ).all()
    
    counts_dict = {row.point_id: row.count for row in results}
    return {"counts": counts_dict}
