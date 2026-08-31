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
    # Admin User
    if db.query(User).first() is None:
        admin = User(
            email="admin@floodguard.ai",
            nome="Administrador",
            hashed_password=hash_password("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()

    # Zonas de Risco no entorno direto da FECAP (Liberdade e Centro)
    zones_data = [
        {
            "nome": "Baixada do Glicério",
            "lat": -23.5592,
            "lon": -46.6288,
            "risco": "critico",
            "prob": 85.0,
            "pop": 14500,
            "desc": "Área de várzea com alagamentos severos frequentes e transbordamento próximo ao Rio Tamanduateí."
        },
        {
            "nome": "Viaduto do Chá / Anhangabaú",
            "lat": -23.5475,
            "lon": -46.6378,
            "risco": "critico",
            "prob": 78.0,
            "pop": 25000,
            "desc": "Ponto histórico de convergência pluvial no Vale do Anhangabaú com risco crítico de inundação."
        },
        {
            "nome": "Av. do Estado (Trecho Radial)",
            "lat": -23.5528,
            "lon": -46.6268,
            "risco": "alto",
            "prob": 68.0,
            "pop": 18000,
            "desc": "Conexão da Radial Leste com Av. do Estado sujeita a retenção de água e alagamentos rápidos."
        },
        {
            "nome": "Rua Conselheiro Furtado",
            "lat": -23.5558,
            "lon": -46.6315,
            "risco": "alto",
            "prob": 58.0,
            "pop": 9200,
            "desc": "Trecho em declive acentuado da Liberdade em direção ao Glicério com enxurradas volumosas."
        },
        {
            "nome": "Praça da Sé",
            "lat": -23.5505,
            "lon": -46.6333,
            "risco": "moderado",
            "prob": 42.0,
            "pop": 30000,
            "desc": "Centro histórico com pontos de escoamento e monitoramento contínuo em dias de chuva."
        },
        {
            "nome": "Av. Liberdade (Frente FECAP)",
            "lat": -23.5574,
            "lon": -46.6367,
            "risco": "baixo",
            "prob": 15.0,
            "pop": 12000,
            "desc": "Região alta da colina da Liberdade em frente ao campus da FECAP. Topografia favorável e risco reduzido."
        },
    ]

    # Atualiza ou insere as zonas de risco
    db.query(Alert).delete()
    db.query(RiskZone).delete()
    db.commit()

    zones = []
    for zd in zones_data:
        poly = [
            [zd['lat']+0.0012, zd['lon']+0.0012],
            [zd['lat']+0.0012, zd['lon']-0.0012],
            [zd['lat']-0.0012, zd['lon']-0.0012],
            [zd['lat']-0.0012, zd['lon']+0.0012]
        ]
        zone = RiskZone(
            nome=zd['nome'],
            descricao=zd['desc'],
            latitude_centro=zd['lat'],
            longitude_centro=zd['lon'],
            raio_metros=180,
            nivel_risco=zd['risco'],
            probabilidade_enchente=zd['prob'],
            populacao_afetada=zd['pop'],
            polygon_coords=json.dumps(poly)
        )
        db.add(zone)
        zones.append(zone)
    db.commit()

    # Sensores no entorno da FECAP
    db.query(SensorReading).delete()
    db.query(Sensor).delete()
    db.commit()

    sensors_data = [
        {"nome": "Pluviômetro FECAP - Campus Liberdade", "tipo": "pluviometro", "lat": -23.5574, "lon": -46.6367},
        {"nome": "Sensor Hidrológico Baixada do Glicério", "tipo": "nivel_rio", "lat": -23.5592, "lon": -46.6288},
        {"nome": "Sensor Pluvial Vale do Anhangabaú", "tipo": "pluviometro", "lat": -23.5475, "lon": -46.6378},
        {"nome": "Umidade do Solo - Praça da Sé", "tipo": "umidade_solo", "lat": -23.5505, "lon": -46.6333},
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

    # Readings históricas
    now = datetime.now(timezone.utc)
    for sensor in sensors:
        for i in range(48):
            t = now - timedelta(hours=i)
            v = random.uniform(0, 40) if sensor.tipo == 'pluviometro' else random.uniform(1, 4)
            u = "mm/h" if sensor.tipo == 'pluviometro' else "m"
            reading = SensorReading(
                sensor_id=sensor.id,
                valor=v,
                unidade=u,
                timestamp=t
            )
            db.add(reading)
    db.commit()

    # Alertas emitidos
    a1 = Alert(zone_id=zones[0].id, tipo="critical", titulo="Alerta Crítico: Baixada do Glicério", mensagem="Risco elevado de alagamento por acúmulo hídrico.", expires_at=now + timedelta(hours=12))
    a2 = Alert(zone_id=zones[1].id, tipo="critical", titulo="Alerta Crítico: Vale do Anhangabaú", mensagem="Transbordamento de galeria pluvial iminente.", expires_at=now + timedelta(hours=12))
    db.add(a1)
    db.add(a2)
    db.commit()

