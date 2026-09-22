import os
import tempfile
from pathlib import Path
from unittest.mock import patch


os.environ["SECRET_KEY"] = "test-secret-key-that-is-not-used-in-production"
os.environ["ENVIRONMENT"] = "development"
os.environ["DATABASE_URL"] = (
    f"sqlite:///{(Path(tempfile.gettempdir()) / 'floodguard_test.db').as_posix()}"
)

from fastapi.testclient import TestClient

from BackEnd.app.database import Base, engine
from BackEnd.app.main import app
from BackEnd.app.routers.river_sensors import (
    RIVER_POLYLINES,
    _min_dist_to_any_polyline,
)
from BackEnd.app.services.prediction_service import _weather_cache


Base.metadata.create_all(bind=engine)
client = TestClient(app)


class FakeWeatherResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "current": {
                "time": "2026-09-22T12:00",
                "precipitation": 2.5,
                "temperature_2m": 21.0,
            },
            "hourly": {
                "time": ["2026-09-22T11:00", "2026-09-22T12:00", "2026-09-22T13:00"],
                "precipitation": [1.0, 2.5, 3.0],
                "precipitation_probability": [60, 80, 90],
            },
            "daily": {
                "time": ["2026-09-22"],
                "precipitation_sum": [6.5],
                "precipitation_probability_max": [90],
            },
        }


def test_login_rejects_invalid_credentials():
    response = client.post(
        "/api/auth/login",
        json={"email": "inexistente@example.com", "senha": "senha-invalida"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "E-mail ou senha incorretos."


def test_weather_forecast_returns_200_with_real_provider_shape():
    _weather_cache.clear()
    with patch(
        "BackEnd.app.services.prediction_service.requests.Session.get",
        return_value=FakeWeatherResponse(),
    ) as mocked_get:
        response = client.get("/api/dashboard/weather?lat=-23.5505&lon=-46.6333")

    assert response.status_code == 200
    assert response.json()["source"] == "open-meteo"
    assert response.json()["current_rain_mm_h"] == 2.5
    assert mocked_get.call_args.kwargs["verify"] is False


def test_known_river_point_is_inside_shapely_buffer():
    coordinates = next(iter(RIVER_POLYLINES.values()))
    lat, lon = coordinates[len(coordinates) // 2]
    distance, river_name = _min_dist_to_any_polyline(lat, lon)

    assert distance == 0.0
    assert river_name in RIVER_POLYLINES
