from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.sensor import Sensor
from ..schemas.sensor import SensorResponse, SensorReadingResponse
from ..services.sensor_service import get_latest_readings, generate_sensor_reading

router = APIRouter(prefix="/api/sensors", tags=["sensors"])

@router.get("", response_model=List[SensorResponse])
def get_sensors(db: Session = Depends(get_db)):
    return db.query(Sensor).all()

@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(sensor_id: int, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor não encontrado")
    return sensor

@router.get("/{sensor_id}/readings", response_model=List[SensorReadingResponse])
def get_readings(sensor_id: int, limit: int = 24, db: Session = Depends(get_db)):
    return get_latest_readings(sensor_id, db, limit)

@router.post("/{sensor_id}/simulate", response_model=SensorReadingResponse)
def simulate_reading(sensor_id: int, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor não encontrado")
    return generate_sensor_reading(sensor, db)
