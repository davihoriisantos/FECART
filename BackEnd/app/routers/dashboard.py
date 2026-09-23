from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from ..database import get_db
from ..models.sensor import Sensor
from ..models.alert import Alert
from ..models.zone import RiskZone
from ..services.prediction_service import fetch_open_meteo_forecast

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
def get_precipitation(
    hours: int = 24,
    lat: float = -23.5505,
    lon: float = -46.6333,
):
    """Retorna precipitação horária real da Open-Meteo, sem consultar mocks."""
    weather = fetch_open_meteo_forecast(lat, lon)
    if weather.get("source") != "open-meteo":
        return weather

    hourly = weather.get("hourly", {})
    timestamps = hourly.get("time", [])
    values = hourly.get("precipitation", hourly.get("rain", []))
    limit = max(1, min(int(hours), 48))
    current_time = (weather.get("current") or {}).get("time", "")
    current_index = next(
        (index for index, value in enumerate(timestamps) if value.startswith(current_time[:13])),
        0,
    )
    end_index = min(len(timestamps), current_index + limit)
    return {
        "source": "open-meteo",
        "lat": lat,
        "lon": lon,
        "precipitation": [
            {"timestamp": timestamps[index], "valor": float(values[index] or 0.0)}
            for index in range(current_index, end_index)
            if index < len(values)
        ],
    }

@router.get("/risk-summary")
def get_risk_summary(db: Session = Depends(get_db)):
    zones = db.query(RiskZone).all()
    return [{"zone_name": z.nome, "nivel_risco": z.nivel_risco, "probabilidade": z.probabilidade_enchente} for z in zones]

@router.get("/weather")
def get_live_weather(lat: float = -23.5505, lon: float = -46.6333):
    """Retorna clima real processado pelo serviço preditivo compartilhado."""
    return fetch_open_meteo_forecast(lat, lon)
