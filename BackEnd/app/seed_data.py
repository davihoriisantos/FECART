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

    # Zonas de Risco Históricas da Defesa Civil / CGE / GeoSampa (Cobertura de São Paulo)
    zones_data = [
        # --- Centro Histórico & Bacia do Tamanduateí ---
        {
            "nome": "Baixada do Glicério",
            "lat": -23.5592,
            "lon": -46.6288,
            "risco": "critico",
            "prob": 88.0,
            "pop": 14500,
            "desc": "Área de várzea com alagamentos severos frequentes e transbordamento próximo ao Rio Tamanduateí."
        },
        {
            "nome": "Viaduto do Chá / Anhangabaú",
            "lat": -23.5475,
            "lon": -46.6378,
            "risco": "critico",
            "prob": 82.0,
            "pop": 25000,
            "desc": "Ponto histórico de convergência pluvial no Vale do Anhangabaú com risco crítico de inundação."
        },
        {
            "nome": "Av. do Estado (Trecho Radial / Mercado)",
            "lat": -23.5528,
            "lon": -46.6268,
            "risco": "alto",
            "prob": 74.0,
            "pop": 18000,
            "desc": "Conexão da Radial Leste com Av. do Estado sujeita a retenção de água e alagamentos rápidos."
        },
        {
            "nome": "Rua Conselheiro Furtado",
            "lat": -23.5558,
            "lon": -46.6315,
            "risco": "alto",
            "prob": 62.0,
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
            "nome": "Av. da Liberdade",
            "lat": -23.5574,
            "lon": -46.6367,
            "risco": "baixo",
            "prob": 15.0,
            "pop": 12000,
            "desc": "Região alta da colina da Liberdade. Topografia favorável e risco reduzido."
        },
        {
            "nome": "Praça da Bandeira / Av. 9 de Julho",
            "lat": -23.5500,
            "lon": -46.6400,
            "risco": "critico",
            "prob": 80.0,
            "pop": 22000,
            "desc": "Bacia de convergência pluvial histórica no início da Av. 9 de Julho com retenção crônica de água."
        },
        {
            "nome": "Santa Cecília / Minhocão (Elevado)",
            "lat": -23.5370,
            "lon": -46.6520,
            "risco": "moderado",
            "prob": 45.0,
            "pop": 19000,
            "desc": "Escoamento pluvial sob as pilastras do elevado com acúmulos pontuais em cruzamentos viários."
        },

        # --- Eixo Marginal Tietê & Zona Norte ---
        {
            "nome": "Marginal Tietê — Ponte das Bandeiras ao Anhembi",
            "lat": -23.5180,
            "lon": -46.6340,
            "risco": "critico",
            "prob": 90.0,
            "pop": 45000,
            "desc": "Ponto crítico histórico da calha do Tietê. Colapso frequente em cheias com interdição da via expressa."
        },
        {
            "nome": "Marginal Tietê — Ponte da Casa Verde",
            "lat": -23.5120,
            "lon": -46.6600,
            "risco": "critico",
            "prob": 85.0,
            "pop": 38000,
            "desc": "Várzea do Rio Tietê com retorno pluvial e retenção em acessos à ponte e pista local."
        },
        {
            "nome": "Santana — Av. Cruzeiro do Sul / Metrô Armênia",
            "lat": -23.5150,
            "lon": -46.6230,
            "risco": "critico",
            "prob": 86.0,
            "pop": 32000,
            "desc": "Confluência dos rios Tietê e Tamanduateí com alagamentos severos na pista central e entorno do metrô."
        },
        {
            "nome": "Limão — Av. Celestino Bourroul / Marginal Tietê",
            "lat": -23.5090,
            "lon": -46.6780,
            "risco": "alto",
            "prob": 70.0,
            "pop": 24000,
            "desc": "Ponto baixo do bairro do Limão sujeito a retenção pluvial e refluxo da calha do Tietê."
        },
        {
            "nome": "Freguesia do Ó — Av. Inajar de Souza / Córrego Cabuçu",
            "lat": -23.4980,
            "lon": -46.6850,
            "risco": "alto",
            "prob": 75.0,
            "pop": 29000,
            "desc": "Córrego Cabuçu de Baixo com transbordamento recorrente em pistas laterais da Av. Inajar de Souza."
        },
        {
            "nome": "Mandaqui — Av. Engenheiro Caetano Álvares",
            "lat": -23.4910,
            "lon": -46.6450,
            "risco": "alto",
            "prob": 72.0,
            "pop": 26000,
            "desc": "Córrego Mandaqui canalizado no canteiro central com alagamentos em episódios de precipitação torrencial."
        },
        {
            "nome": "Pirituba — Av. Raimundo Pereira de Magalhães / Tietê",
            "lat": -23.5110,
            "lon": -46.7250,
            "risco": "alto",
            "prob": 68.0,
            "pop": 21000,
            "desc": "Deságue de córregos da bacia de Pirituba na calha do Tietê com interdição de trânsito em temporais."
        },
        {
            "nome": "Tremembé / Cantareira — Córrego Cabuçu de Cima",
            "lat": -23.4560,
            "lon": -46.6180,
            "risco": "alto",
            "prob": 65.0,
            "pop": 17000,
            "desc": "Bacia de resposta hidrológica ultrarrápida descendente da Serra da Cantareira."
        },

        # --- Eixo Marginal Pinheiros & Zona Oeste ---
        {
            "nome": "Marginal Pinheiros — Ceagesp / Viaduto Jaguaré",
            "lat": -23.5350,
            "lon": -46.7350,
            "risco": "critico",
            "prob": 88.0,
            "pop": 36000,
            "desc": "Baixada do Ceagesp próxima à confluência dos rios Pinheiros e Tietê com alagamentos de grande magnitude."
        },
        {
            "nome": "Marginal Pinheiros — Ponte Cidade Jardim",
            "lat": -23.5850,
            "lon": -46.6900,
            "risco": "critico",
            "prob": 82.0,
            "pop": 41000,
            "desc": "Extensa área da calha do Pinheiros sujeita a alagamentos em pistas expressas e alças de acesso."
        },
        {
            "nome": "Marginal Pinheiros — Ponte Roberto Zuccolo",
            "lat": -23.5280,
            "lon": -46.7150,
            "risco": "alto",
            "prob": 74.0,
            "pop": 28000,
            "desc": "Região da Lapa de Baixo com refluxo de águas pluviais próximo à ponte."
        },
        {
            "nome": "Lapa — Av. Ermano Marchetti / Guaicurus",
            "lat": -23.5189,
            "lon": -46.7020,
            "risco": "alto",
            "prob": 76.0,
            "pop": 27000,
            "desc": "Região baixa da Lapa com histórico de alagamentos que bloqueiam vias e o comércio local."
        },
        {
            "nome": "Perdizes / Pompeia — Av. Pompeia / Córrego Água Preta",
            "lat": -23.5280,
            "lon": -46.6850,
            "risco": "critico",
            "prob": 84.0,
            "pop": 31000,
            "desc": "Fundo de vale entre colinas com rápido acúmulo de enxurradas na Av. Pompeia e Francisco Matarazzo."
        },
        {
            "nome": "Butantã — Av. Vital Brasil / Bacia Rio Pirajuçara",
            "lat": -23.5710,
            "lon": -46.7080,
            "risco": "alto",
            "prob": 71.0,
            "pop": 25000,
            "desc": "Vale de aproximação do metrô Butantã com refluxo de córregos afluentes do Rio Pinheiros."
        },
        {
            "nome": "Pinheiros — Av. Brig. Faria Lima / Rebouças",
            "lat": -23.5680,
            "lon": -46.6920,
            "risco": "moderado",
            "prob": 48.0,
            "pop": 35000,
            "desc": "Trechos viários com acúmulo moderado de águas pluviais em sarjetas e cruzamentos."
        },

        # --- Zona Leste (Bacias Aricanduva, Tamanduateí e Tietê Leste) ---
        {
            "nome": "Tatuapé — Radial Leste / Rio Aricanduva",
            "lat": -23.5430,
            "lon": -46.5610,
            "risco": "critico",
            "prob": 92.0,
            "pop": 48000,
            "desc": "Confluência do Rio Aricanduva com a Radial Leste. Área frequentemente intransitável em temporais."
        },
        {
            "nome": "Av. Aricanduva — Shopping Aricanduva",
            "lat": -23.5550,
            "lon": -46.5250,
            "risco": "critico",
            "prob": 94.0,
            "pop": 52000,
            "desc": "Epicentro histórico de inundações na Zona Leste com transbordamento recorrente do Rio Aricanduva."
        },
        {
            "nome": "Vila Prudente — Bacia Córrego da Mooca / Anhaia Mello",
            "lat": -23.5890,
            "lon": -46.5600,
            "risco": "critico",
            "prob": 87.0,
            "prob": 87.0,
            "pop": 33000,
            "desc": "Córrego da Mooca e Av. Anhaia Mello com refluxo violento de águas e bolsões profundos."
        },
        {
            "nome": "Mooca — Rua dos Trilhos / Ibitirama",
            "lat": -23.5580,
            "lon": -46.5950,
            "risco": "alto",
            "prob": 73.0,
            "pop": 23000,
            "desc": "Ponto baixo da Mooca próximo à linha férrea com retenção histórica de volume pluvial."
        },
        {
            "nome": "Itaquera — Bacia do Rio Verde / Radial Leste",
            "lat": -23.5395,
            "lon": -46.4580,
            "risco": "alto",
            "prob": 70.0,
            "pop": 34000,
            "desc": "Confluência de córregos da bacia de Itaquera na Radial Leste com transbordamento sazonal."
        },
        {
            "nome": "Penha — Av. São Miguel / Córrego Tiquatira",
            "lat": -23.5210,
            "lon": -46.5380,
            "risco": "alto",
            "prob": 69.0,
            "pop": 28000,
            "desc": "Parque Linear Tiquatira e cruzamentos da Av. São Miguel com extravasamento pluvial."
        },
        {
            "nome": "São Miguel Paulista — Av. Marechal Tito / Rio Tietê",
            "lat": -23.4950,
            "lon": -46.4420,
            "risco": "alto",
            "prob": 76.0,
            "pop": 37000,
            "desc": "Região leste de planície aluvial do Tietê sujeita a inundações de longa duração em dias chuvosos."
        },
        {
            "nome": "São Mateus — Av. Ragueb Chohfi / Córrego Caguaçu",
            "lat": -23.5980,
            "lon": -46.4780,
            "risco": "alto",
            "prob": 72.0,
            "pop": 30000,
            "desc": "Trechos baixos da Av. Ragueb Chohfi e Mateo Bei com acúmulos intensos de enxurrada."
        },

        # --- Zona Sul (Bacias Ipiranga, Pinheirinho, Zavuvus e Represas) ---
        {
            "nome": "Brooklin — Av. dos Bandeirantes / Córrego Pinheirinho",
            "lat": -23.6120,
            "lon": -46.6780,
            "risco": "critico",
            "prob": 86.0,
            "pop": 39000,
            "desc": "Av. dos Bandeirantes com pontos crônicos de alagamento que paralisam o trânsito até Congonhas."
        },
        {
            "nome": "Ipiranga — Av. Dr. Ricardo Jafet / Córrego Ipiranga",
            "lat": -23.5850,
            "lon": -46.6080,
            "risco": "alto",
            "prob": 78.0,
            "pop": 29000,
            "desc": "Fundo de vale da Av. Ricardo Jafet com transbordamento do Córrego Ipiranga em chuvas severas."
        },
        {
            "nome": "Sacomã — Av. Sapopemba / Córrego Oratório",
            "lat": -23.5998,
            "lon": -46.5501,
            "risco": "critico",
            "prob": 83.0,
            "pop": 27000,
            "desc": "Área de confluência com histórico recorrente. A Av. Sapopemba alaga rapidamente com chuvas moderadas."
        },
        {
            "nome": "Santo Amaro — Av. Santo Amaro / Roque Petroni Jr.",
            "lat": -23.6280,
            "lon": -46.6960,
            "risco": "alto",
            "prob": 70.0,
            "pop": 36000,
            "desc": "Várzea do Rio Pinheiros próxima ao Shopping Morumbi com bolsões frequentes de água."
        },
        {
            "nome": "Jabaquara — Bacia Córrego Zavuvus / Av. Interlagos",
            "lat": -23.6650,
            "lon": -46.6750,
            "risco": "critico",
            "prob": 85.0,
            "pop": 31000,
            "desc": "Córrego Zavuvus com transbordamento histórico crônico em trechos residenciais e comerciais."
        },
        {
            "nome": "Campo Limpo — Estrada de Itapecerica / Pirajuçara",
            "lat": -23.6490,
            "lon": -46.7550,
            "risco": "alto",
            "prob": 74.0,
            "pop": 33000,
            "desc": "Bacia do Pirajuçara na Zona Sul-Oeste com rápida elevação de nível hídrico das vias."
        },
        {
            "nome": "Capão Redondo — Estrada de M'Boi Mirim",
            "lat": -23.6820,
            "lon": -46.7720,
            "risco": "alto",
            "prob": 68.0,
            "pop": 28000,
            "desc": "Vias troncais de drenagem sobrecarregada com escoamento rápido de encostas urbanizadas."
        },
        {
            "nome": "Socorro / Interlagos — Ponte do Socorro / Guarapiranga",
            "lat": -23.6740,
            "lon": -46.7110,
            "risco": "alto",
            "prob": 75.0,
            "pop": 26000,
            "desc": "Área de influência da Represa Guarapiranga e calha do Pinheiros com pontos de retenção."
        }
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

    # Sensores na região central da Liberdade
    db.query(SensorReading).delete()
    db.query(Sensor).delete()
    db.commit()

    sensors_data = [
        {"nome": "Pluviômetro Liberdade - Centro", "tipo": "pluviometro", "lat": -23.5574, "lon": -46.6367},
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

