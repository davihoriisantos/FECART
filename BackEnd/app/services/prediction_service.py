"""Motor determinístico de risco de enchente do FloodGuard AI."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..models.zone import RiskZone


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
    # Defesa Civil tem prioridade dentro da faixa conjunta de 20%.
    terrain_history_score = historical_score * 0.70 + terrain_score * 0.30
    raw_risk = (
        rain_score * 0.50
        + river_score * 0.30
        + terrain_history_score * 0.20
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
            "nivel_rio": river_score,
            "relevo_historico": round(terrain_history_score, 1),
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
