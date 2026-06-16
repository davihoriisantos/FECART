import json
import random
from sqlalchemy.orm import Session
from .models.user import User
from .models.sensor import Sensor, SensorReading
from .models.zone import RiskZone
from .models.alert import Alert
from .services.auth_service import hash_password
from datetime import datetime, timedelta, timezone

def seed_database(db: Session):
    if db.query(User).first() is not None:
        return

    # Admin User
    admin = User(
        email="admin@floodguard.ai",
        nome="Administrador",
        hashed_password=hash_password("admin123"),
        role="admin"
    )
    db.add(admin)

    # Zones
    zones_data = [
        {"nome": "Mooca Baixa", "lat": -23.5590, "lon": -46.5950, "risco": "critico", "prob": 75, "pop": 12000},
        {"nome": "Entorno Córrego", "lat": -23.5575, "lon": -46.5960, "risco": "alto", "prob": 60, "pop": 8500},
        {"nome": "Av Paes de Barros", "lat": -23.5585, "lon": -46.5950, "risco": "alto", "prob": 55, "pop": 15000},
        {"nome": "Parque da Mooca", "lat": -23.5565, "lon": -46.5935, "risco": "moderado", "prob": 35, "pop": 5000},
        {"nome": "Alto da Mooca", "lat": -23.5540, "lon": -46.6010, "risco": "baixo", "prob": 15, "pop": 20000},
        {"nome": "Rua da Mooca", "lat": -23.5590, "lon": -46.5980, "risco": "moderado", "prob": 40, "pop": 18000},
    ]

    zones = []
    for zd in zones_data:
        poly = [
            [zd['lat']+0.001, zd['lon']+0.001],
            [zd['lat']+0.001, zd['lon']-0.001],
            [zd['lat']-0.001, zd['lon']-0.001],
            [zd['lat']-0.001, zd['lon']+0.001]
        ]
        zone = RiskZone(
            nome=zd['nome'],
            descricao=f"Região: {zd['nome']}",
            latitude_centro=zd['lat'],
            longitude_centro=zd['lon'],
            raio_metros=150,
            nivel_risco=zd['risco'],
            probabilidade_enchente=zd['prob'],
            populacao_afetada=zd['pop'],
            polygon_coords=json.dumps(poly)
        )
        db.add(zone)
        zones.append(zone)
    db.commit()

    # Sensors
    sensors_data = [
        {"nome": "Pluviômetro Parque da Mooca", "tipo": "pluviometro", "lat": -23.5565, "lon": -46.5935},
        {"nome": "Nível Rio Tamanduateí", "tipo": "nivel_rio", "lat": -23.5610, "lon": -46.5920},
        {"nome": "Umidade Solo - Praça Prudente", "tipo": "umidade_solo", "lat": -23.5555, "lon": -46.5945},
    ]

    sensors = []
    for sd in sensors_data:
        sensor = Sensor(
            nome=sd['nome'],
            tipo=sd['tipo'],
            latitude=sd['lat'],
            longitude=sd['lon'],
            descricao=f"Sensor {sd['tipo']} instalado em {sd['nome']}"
        )
        db.add(sensor)
        sensors.append(sensor)
    db.commit()

    # Readings
    now = datetime.now(timezone.utc)
    for sensor in sensors:
        for i in range(48):
            t = now - timedelta(hours=i)
            v = random.uniform(0, 50) if sensor.tipo == 'pluviometro' else random.uniform(1, 5)
            u = "mm/h" if sensor.tipo == 'pluviometro' else "m"
            reading = SensorReading(
                sensor_id=sensor.id,
                valor=v,
                unidade=u,
                timestamp=t
            )
            db.add(reading)
    db.commit()

    # Alerts
    a1 = Alert(zone_id=zones[0].id, tipo="critical", titulo="Alerta Crítico: Mooca Baixa", mensagem="Risco elevado de alagamento.", expires_at=now + timedelta(hours=12))
    a2 = Alert(zone_id=zones[1].id, tipo="warning", titulo="Atenção: Córrego", mensagem="Nível subindo.", expires_at=now + timedelta(hours=12))
    db.add(a1)
    db.add(a2)
    db.commit()
