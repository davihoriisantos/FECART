"""Gera a malha hidrográfica estática de SP a partir do OpenStreetMap.

Este script é usado apenas durante o desenvolvimento. A aplicação em produção
carrega somente o GeoJSON gerado e não realiza qualquer chamada de rede.
"""

from __future__ import annotations

import json
import math
import sys
import argparse
from pathlib import Path

import requests
import urllib3


OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"
BBOX = "-23.82,-46.90,-23.35,-46.30"
NAMES = [
    "Tietê", "Pinheiros", "Tamanduateí", "Aricanduva", "Anhangabaú",
    "Ipiranga", "Jaguaré", "Pirajuçara", "Mandaqui", "Cabuçu",
    "Água Branca", "Saracura", "Zavuvus", "Lapa", "Tiquatira",
    "Itaquera", "Jacu", "Pacaembu", "Sapateiro", "Embu-Mirim",
]
OUTPUT = Path(__file__).resolve().parents[1] / "app" / "data" / "sp_hydrography_highres.json"


def densify(coordinates: list[list[float]], spacing_m: float = 15.0) -> list[list[float]]:
    result: list[list[float]] = []
    for start, end in zip(coordinates, coordinates[1:]):
        lon1, lat1 = start
        lon2, lat2 = end
        distance = math.hypot((lon2 - lon1) * 102000.0, (lat2 - lat1) * 111000.0)
        steps = max(1, math.ceil(distance / spacing_m))
        for index in range(steps):
            ratio = index / steps
            result.append([
                round(lon1 + (lon2 - lon1) * ratio, 7),
                round(lat1 + (lat2 - lat1) * ratio, 7),
            ])
    if coordinates:
        result.append([round(coordinates[-1][0], 7), round(coordinates[-1][1], 7)])
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", action="store_true", help="gera apenas com a base local")
    args = parser.parse_args()
    # O laboratório usa inspeção TLS com certificado local; estas chamadas existem
    # somente no gerador offline e nunca são executadas pela aplicação.
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    elements = []
    try:
        if args.local:
            raise requests.RequestException("modo local solicitado")
        for name in NAMES:
            query = f'''[out:json][timeout:90];
            way["waterway"~"river|stream|canal|drain"]["name"~"{name}",i]({BBOX});
            out geom;'''
            response = requests.post(
                OVERPASS_URL,
                data={"data": query},
                headers={"User-Agent": "FloodGuardAI-HydrographyBuilder/1.0"},
                timeout=120,
                verify=False,
            )
            response.raise_for_status()
            elements.extend(response.json().get("elements", []))
    except requests.RequestException as exc:
        print(f"OpenStreetMap indisponível ({exc}); usando a base local calibrada.")

    features = []
    for element in elements:
        geometry = element.get("geometry") or []
        if len(geometry) < 2:
            continue
        coordinates = [[point["lon"], point["lat"]] for point in geometry]
        tags = element.get("tags") or {}
        features.append({
            "type": "Feature",
            "properties": {
                "name": tags.get("name", "Curso d'água sem nome"),
                "osm_way_id": element.get("id"),
                "waterway": tags.get("waterway"),
            },
            "geometry": {"type": "LineString", "coordinates": densify(coordinates)},
        })

    if not features:
        backend_root = Path(__file__).resolve().parents[1]
        sys.path.insert(0, str(backend_root))
        from app.routers.river_sensors import RIVER_POLYLINES

        for name, lat_lon_coordinates in RIVER_POLYLINES.items():
            coordinates = [[lon, lat] for lat, lon in lat_lon_coordinates]
            features.append({
                "type": "Feature",
                "properties": {"name": name, "source": "base-local-calibrada"},
                "geometry": {"type": "LineString", "coordinates": densify(coordinates)},
            })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"{len(features)} trechos salvos em {OUTPUT}")
    print(f"{sum(len(f['geometry']['coordinates']) for f in features)} vértices totais")


if __name__ == "__main__":
    main()
