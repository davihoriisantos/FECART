import random
from sqlalchemy.orm import Session
from ..models.zone import RiskZone
from datetime import datetime, timezone

def calculate_flood_risk(zone: RiskZone, db: Session) -> dict:
    # Simulando lógica baseada nos modelos (aqui apenas de forma randômica guiada por pesos para exemplo)
    probabilidade = random.uniform(0, 100)
    
    if probabilidade >= 80:
        nivel_risco = "critico"
    elif probabilidade >= 50:
        nivel_risco = "alto"
    elif probabilidade >= 30:
        nivel_risco = "moderado"
    else:
        nivel_risco = "baixo"
        
    return {
        "nivel_risco": nivel_risco,
        "probabilidade": probabilidade,
        "fatores": {
            "precipitacao": random.uniform(0, 100),
            "nivel_rio": random.uniform(0, 100),
            "umidade_solo": random.uniform(0, 100)
        }
    }

def update_all_zones_risk(db: Session) -> None:
    zones = db.query(RiskZone).all()
    for zone in zones:
        risk_data = calculate_flood_risk(zone, db)
        zone.nivel_risco = risk_data['nivel_risco']
        zone.probabilidade_enchente = risk_data['probabilidade']
        zone.ultima_atualizacao = datetime.now(timezone.utc)
    db.commit()
