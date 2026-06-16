import random
from sqlalchemy.orm import Session
from ..models.sensor import Sensor, SensorReading
from datetime import datetime, timezone

def generate_sensor_reading(sensor: Sensor, db: Session) -> SensorReading:
    valor = 0.0
    unidade = ""
    if sensor.tipo == 'pluviometro':
        # mostly low, occasional high
        if random.random() > 0.8:
            valor = random.uniform(10.0, 80.0)
        else:
            valor = random.uniform(0.0, 5.0)
        unidade = "mm/h"
    elif sensor.tipo == 'nivel_rio':
        valor = random.uniform(1.0, 6.0)
        unidade = "m"
    elif sensor.tipo == 'umidade_solo':
        valor = random.uniform(30.0, 100.0)
        unidade = "%"

    reading = SensorReading(
        sensor_id=sensor.id,
        valor=valor,
        unidade=unidade,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading

def get_latest_readings(sensor_id: int, db: Session, limit: int = 24):
    return db.query(SensorReading).filter(SensorReading.sensor_id == sensor_id).order_by(SensorReading.timestamp.desc()).limit(limit).all()

def get_sensor_stats(sensor_id: int, db: Session) -> dict:
    # Optional logic
    return {}
