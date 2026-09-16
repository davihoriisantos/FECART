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

import time
import requests
import urllib3
urllib3.disable_warnings()

# Cache em memória indexado por coordenadas aproximadas (raio ~1km) com TTL de 3 minutos
_weather_cache_dict = {}

@router.get("/weather")
def get_live_weather(lat: float = -23.5505, lon: float = -46.6333):
    """
    Endpoint de dados meteorológicos reais da Open-Meteo.
    Retorna a precipitação atual (mm/h), histórico acumulado das últimas 24h e série horária.
    Possui cache por coordenada e fallback resiliente.
    """
    coord_key = f"{round(lat, 3)}_{round(lon, 3)}"
    now = time.time()
    
    cached_entry = _weather_cache_dict.get(coord_key)
    if cached_entry and now < cached_entry["expires_at"]:
        return cached_entry["data"]
    
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        "&current=precipitation,rain,showers,temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
        "&hourly=precipitation,rain,showers,precipitation_probability,soil_moisture_0_to_1cm"
        "&daily=precipitation_sum,precipitation_probability_max"
        "&past_days=1&forecast_days=1&timezone=America%2FSao_Paulo"
    )
    
    data = None
    errors = []
    # Alguns ambientes Windows injetam proxy/certificado inválido. A segunda
    # tentativa ignora variáveis de proxy do processo, sem inventar dados.
    for trust_environment in (True, False):
        try:
            session = requests.Session()
            session.trust_env = trust_environment
            r = session.get(url, verify=False, timeout=8)
            if r.status_code == 200:
                candidate = r.json()
                if candidate.get("hourly") and candidate.get("current"):
                    data = candidate
                    break
            errors.append(f"HTTP {r.status_code}")
        except Exception as e:
            errors.append(str(e))
    
    # Se falhou e tem cache antigo, usa o cache
    if not data and cached_entry:
        return cached_entry["data"]
        
    if not data:
        return {
            "error": "Serviço meteorológico temporariamente indisponível",
            "lat": lat,
            "lon": lon,
            "source": "unavailable",
            "details": errors[-1] if errors else "sem resposta",
        }
    
    current = data.get("current", {})
    hourly = data.get("hourly", {})
    
    current_rain = float(current.get("precipitation") or current.get("rain") or 0.0)
    
    # Cálculo do acumulado real das últimas 24 horas
    hourly_precip = hourly.get("precipitation", [])
    hourly_times = hourly.get("time", [])
    current_time_str = current.get("time", "")
    
    current_idx = -1
    for i, t in enumerate(hourly_times):
        if t.startswith(current_time_str[:13]):
            current_idx = i
            break
    if current_idx == -1 and hourly_times:
        current_idx = len(hourly_times) - 8
        
    acc_24h = 0.0
    if current_idx >= 0 and hourly_precip:
        for j in range(24):
            idx = current_idx - j
            if 0 <= idx < len(hourly_precip) and hourly_precip[idx] is not None:
                acc_24h += float(hourly_precip[idx])
                
    response_payload = {
        "lat": lat,
        "lon": lon,
        "current_rain_mm_h": round(current_rain, 1),
        "accumulated_24h_mm": round(acc_24h, 1),
        "current": current,
        "hourly": hourly,
        "daily": data.get("daily", {}),
        "source": "open-meteo",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    
    _weather_cache_dict[coord_key] = {
        "data": response_payload,
        "expires_at": now + 180  # 3 minutos de TTL
    }
    
    return response_payload
