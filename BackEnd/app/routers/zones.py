from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.zone import RiskZone
from ..schemas.zone import RiskZoneResponse, HeatmapPoint
from ..services.prediction_service import update_all_zones_risk

router = APIRouter(prefix="/api/zones", tags=["zones"])

@router.get("", response_model=List[RiskZoneResponse])
def get_zones(db: Session = Depends(get_db)):
    return db.query(RiskZone).all()

@router.get("/heatmap", response_model=List[HeatmapPoint])
def get_heatmap(db: Session = Depends(get_db)):
    zones = db.query(RiskZone).all()
    points = []
    for zone in zones:
        points.append(HeatmapPoint(
            latitude=zone.latitude_centro,
            longitude=zone.longitude_centro,
            intensity=zone.probabilidade_enchente / 100.0
        ))
    return points

@router.get("/{zone_id}", response_model=RiskZoneResponse)
def get_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(RiskZone).filter(RiskZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona não encontrada")
    return zone

@router.post("/update-risks")
def update_risks(db: Session = Depends(get_db)):
    update_all_zones_risk(db)
    return {"message": "Riscos atualizados com sucesso"}
