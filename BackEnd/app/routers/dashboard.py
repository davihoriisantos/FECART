from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import List
from ..database import get_db
from ..models.sensor import Sensor, SensorReading
from ..models.alert import Alert
from ..models.zone import RiskZone

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_sensores = db.query(Sensor).count()
    sensores_ativos = db.query(Sensor).filter(Sensor.status == 'ativo').count()
    total_alertas_ativos = db.query(Alert).filter(Alert.ativo == True).count()
    zonas_criticas = db.query(RiskZone).filter(RiskZone.nivel_risco == 'critico').count()
    zonas_alerta = db.query(RiskZone).filter(RiskZone.nivel_risco == 'alto').count()
    
    return {
        "total_sensores": total_sensores,
        "sensores_ativos": sensores_ativos,
        "total_alertas_ativos": total_alertas_ativos,
        "zonas_criticas": zonas_criticas,
        "zonas_alerta": zonas_alerta,
        "ultima_atualizacao": datetime.now(timezone.utc).isoformat()
    }

@router.get("/precipitation")
def get_precipitation(hours: int = 24, db: Session = Depends(get_db)):
    time_limit = datetime.now(timezone.utc) - timedelta(hours=hours)
    # Simulate precipitation data for dashboard
    pluviometros = db.query(Sensor).filter(Sensor.tipo == 'pluviometro').all()
    if not pluviometros:
        return []
        
    sensor_id = pluviometros[0].id
    readings = db.query(SensorReading).filter(
        SensorReading.sensor_id == sensor_id,
        SensorReading.timestamp >= time_limit
    ).order_by(SensorReading.timestamp).all()
    
    return [{"timestamp": r.timestamp.isoformat(), "valor": r.valor} for r in readings]

@router.get("/risk-summary")
def get_risk_summary(db: Session = Depends(get_db)):
    zones = db.query(RiskZone).all()
    return [{"zone_name": z.nome, "nivel_risco": z.nivel_risco, "probabilidade": z.probabilidade_enchente} for z in zones]
