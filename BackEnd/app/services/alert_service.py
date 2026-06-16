from sqlalchemy.orm import Session
from ..models.alert import Alert
from ..models.zone import RiskZone
from datetime import datetime, timedelta, timezone

def check_and_generate_alerts(db: Session) -> list[Alert]:
    zones = db.query(RiskZone).all()
    new_alerts = []
    
    for zone in zones:
        tipo = None
        titulo = ""
        mensagem = ""
        if zone.probabilidade_enchente >= 80:
            tipo = "critical"
            titulo = f"Alerta Crítico: {zone.nome}"
            mensagem = f"Risco elevado de alagamento na região {zone.nome}."
        elif zone.probabilidade_enchente >= 50:
            tipo = "warning"
            titulo = f"Alerta de Atenção: {zone.nome}"
            mensagem = f"Possibilidade de alagamento na região {zone.nome} devido às chuvas recentes."
        elif zone.probabilidade_enchente >= 30:
            tipo = "info"
            titulo = f"Informativo: {zone.nome}"
            mensagem = f"Monitoramento intensificado na região {zone.nome}."
            
        if tipo:
            # Check if active alert already exists
            existing_alert = db.query(Alert).filter(Alert.zone_id == zone.id, Alert.ativo == True).first()
            if not existing_alert or existing_alert.tipo != tipo:
                alert = Alert(
                    zone_id=zone.id,
                    tipo=tipo,
                    titulo=titulo,
                    mensagem=mensagem,
                    expires_at=datetime.now(timezone.utc) + timedelta(hours=12)
                )
                db.add(alert)
                new_alerts.append(alert)
                
    if new_alerts:
        db.commit()
        for alert in new_alerts:
            db.refresh(alert)
    return new_alerts

def get_active_alerts(db: Session) -> list[Alert]:
    return db.query(Alert).filter(Alert.ativo == True).order_by(Alert.created_at.desc()).all()

def deactivate_expired_alerts(db: Session) -> int:
    now = datetime.now(timezone.utc)
    alerts = db.query(Alert).filter(Alert.ativo == True, Alert.expires_at < now).all()
    count = 0
    for alert in alerts:
        alert.ativo = False
        count += 1
    if count > 0:
        db.commit()
    return count
