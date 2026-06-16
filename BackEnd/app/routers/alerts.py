from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.alert import Alert
from ..models.user import User
from ..schemas.alert import AlertResponse, AlertCreate, AlertUpdate
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("", response_model=List[AlertResponse])
def get_active_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.ativo == True).order_by(Alert.created_at.desc()).all()

@router.get("/history", response_model=List[AlertResponse])
def get_alert_history(db: Session = Depends(get_db)):
    return db.query(Alert).order_by(Alert.created_at.desc()).all()

@router.post("", response_model=AlertResponse)
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar alertas manuais")
    new_alert = Alert(**alert_in.model_dump())
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, alert_in: AlertUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar alertas")
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    update_data = alert_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)
    db.commit()
    db.refresh(alert)
    return alert
