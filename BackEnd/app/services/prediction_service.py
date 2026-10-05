"""Motor determinístico de risco de enchente do FloodGuard AI."""

from datetime import datetime, timezone
from typing import Optional
import time

import requests

from sqlalchemy.orm import Session

from ..config import settings
from ..models.zone import RiskZone


_weather_cache: dict[str, dict] = {}


def fetch_open_meteo_forecast(lat: float, lon: float) -> dict:
    """Obtém clima real da Open-Meteo com cache curto e TLS por ambiente."""
    coord_key = f"{round(lat, 3)}_{round(lon, 3)}"
    now = time.time()
    cached = _weather_cache.get(coord_key)
    if cached and now < cached["expires_at"]:
        return cached["data"]

    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        "&current=precipitation,rain,showers,temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
        "&hourly=precipitation,rain,showers,precipitation_probability,soil_moisture_0_to_1cm"
        "&daily=precipitation_sum,precipitation_probability_max"
        "&past_days=1&forecast_days=1&timezone=America%2FSao_Paulo"
    )
    errors = []
    data = None
    for trust_environment in (True, False):
        try:
            session = requests.Session()
            session.trust_env = trust_environment
            response = session.get(url, timeout=8, verify=settings.VERIFY_SSL)
            response.raise_for_status()
            candidate = response.json()
            if candidate.get("hourly") and candidate.get("current"):
                data = candidate
                break
            errors.append("Resposta sem dados horários ou atuais")
        except (requests.RequestException, ValueError) as exc:
            errors.append(str(exc))

    if not data and cached:
        return cached["data"]
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
    hourly_precip = hourly.get("precipitation", [])
    hourly_times = hourly.get("time", [])
    current_time = current.get("time", "")
    current_idx = next(
        (index for index, value in enumerate(hourly_times) if value.startswith(current_time[:13])),
        len(hourly_times) - 8 if hourly_times else -1,
    )

    def accumulated(hours: int) -> float:
        if current_idx < 0:
            return 0.0
        return sum(
            float(hourly_precip[index] or 0.0)
            for index in range(max(0, current_idx - hours + 1), current_idx + 1)
            if index < len(hourly_precip)
        )

    today = current_time[:10] or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily = data.get("daily", {})
    daily_times = daily.get("time", [])
    daily_sums = daily.get("precipitation_sum", [])
    today_sum = 0.0
    if today in daily_times:
        index = daily_times.index(today)
        if index < len(daily_sums):
            today_sum = float(daily_sums[index] or 0.0)

    payload = {
        "lat": lat,
        "lon": lon,
        "current_rain_mm_h": round(current_rain, 1),
        "accumulated_24h_mm": round(accumulated(24), 1),
        "accumulated_recent_3h_mm": round(accumulated(3), 1),
        "today_rain_sum_mm": round(today_sum, 1),
        "is_raining_now": current_rain > 0.0,
        "current": current,
        "hourly": hourly,
        "daily": daily,
        "source": "open-meteo",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    _weather_cache[coord_key] = {"data": payload, "expires_at": now + 180}
    return payload


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, float(value)))


def rain_risk_cap(current_rain_mm_h: float, accumulated_24h_mm: float) -> float:
    """
    Teto eliminatório (Gatekeeper Absoluto):
    Se a Chuva Atual for 0.0 mm/h e o acumulado < 1.0 mm, o risco NÃO PODE
    ultrapassar 20% (Status VERDE - Condição Segura / Risco Baixo).
    Sem chuva no momento (0.0 mm/h), o teto é estritamente < 20%.
    """
    rain = max(0.0, float(current_rain_mm_h or 0.0))
    accumulated = max(0.0, float(accumulated_24h_mm or 0.0))
    if rain == 0.0 and accumulated < 1.0:
        return 15.0  # Risco Baixo garantido (<20%)
    if rain == 0.0 and accumulated <= 10.0:
        return 18.0  # Risco Baixo garantido (<20%)
    if rain == 0.0:
        return 19.5  # Teto absoluto sem chuva atual (<20%)
    if rain > 15.0 or accumulated > 40.0:
        return 100.0
    if 0.1 <= rain <= 5.0:
        return 45.0
    return 75.0


def calculate_predictive_risk(
    *, rain_factor: float, river_factor: float, terrain_factor: float,
    historical_factor: float, current_rain_mm_h: float,
    accumulated_24h_mm: float,
) -> dict:
    """Aplica pesos 50/30/20 e a trava eliminatória de chuva."""
    rain_score = _clamp(rain_factor)
    river_score = _clamp(river_factor)
    historical_score = _clamp(historical_factor)
    terrain_score = _clamp(terrain_factor)
    # Pesos recalibrados: Chuva 45% | Histórico Defesa Civil 25% | Terreno/Vales 15% | Rios 15%
    raw_risk = (
        rain_score * 0.45
        + historical_score * 0.25
        + terrain_score * 0.15
        + river_score * 0.15
    )
    cap = rain_risk_cap(current_rain_mm_h, accumulated_24h_mm)
    final_risk = round(min(raw_risk, cap), 1)

    # Gatekeeper Absoluto: sem chuva no momento, obrigatoriamente Risco Baixo (<20%)
    if current_rain_mm_h == 0.0 and accumulated_24h_mm < 1.0:
        final_risk = min(final_risk, 15.0)
    elif current_rain_mm_h == 0.0:
        final_risk = min(final_risk, 18.0)

    if final_risk >= 80:
        level = "critico"
    elif final_risk >= 51:
        level = "alto"
    elif final_risk >= 31:
        level = "moderado"
    else:
        level = "baixo"

    return {
        "nivel_risco": level,
        "probabilidade": final_risk,
        "fatores": {
            "chuva": rain_score,
            "historico_defesa_civil": historical_score,
            "terreno": terrain_score,
            "nivel_rio": river_score,
            "teto_chuva": cap,
        },
    }


def calculate_forecast_risk(
    *, forecast_rain_mm_h: float, forecast_accumulated_mm: float,
    rain_factor: float, river_factor: float, terrain_factor: float,
    historical_factor: float,
) -> dict:
    """Risco de +1h a +3h usando somente a chuva prevista para o período.

    O céu limpo no instante atual não participa desta função. A trava de chuva
    continua existindo, mas é aplicada ao volume futuro informado pela previsão.
    """
    result = calculate_predictive_risk(
        rain_factor=rain_factor,
        river_factor=river_factor,
        terrain_factor=terrain_factor,
        historical_factor=historical_factor,
        current_rain_mm_h=max(0.0, float(forecast_rain_mm_h or 0.0)),
        accumulated_24h_mm=max(0.0, float(forecast_accumulated_mm or 0.0)),
    )
    result["modo"] = "projecao_futura"
    return result


def calculate_flood_risk(
    zone: RiskZone, db: Session, *, current_rain_mm_h: float = 0.0,
    accumulated_24h_mm: float = 0.0, rain_factor: float = 0.0,
    river_factor: float = 0.0, terrain_factor: float = 50.0,
    historical_factor: Optional[float] = None,
) -> dict:
    """Atualiza zonas sem gerar fatores aleatórios ou falsos alertas."""
    history = historical_factor
    if history is None:
        history = float(zone.probabilidade_enchente or 40.0)
    return calculate_predictive_risk(
        rain_factor=rain_factor,
        river_factor=river_factor,
        terrain_factor=terrain_factor,
        historical_factor=history,
        current_rain_mm_h=current_rain_mm_h,
        accumulated_24h_mm=accumulated_24h_mm,
    )


def update_all_zones_risk(db: Session) -> None:
    zones = db.query(RiskZone).all()
    for zone in zones:
        risk_data = calculate_flood_risk(zone, db)
        zone.nivel_risco = risk_data["nivel_risco"]
        zone.probabilidade_enchente = risk_data["probabilidade"]
        zone.ultima_atualizacao = datetime.now(timezone.utc)
    db.commit()
