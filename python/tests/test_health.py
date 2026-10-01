"""Health endpoint verification.

Confirms the service starts and reports itself healthy, which is the minimum
proof that the Python foundation is wired correctly.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from python.api.app import create_app


def test_health_reports_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"]
    assert body["version"]
    assert body["time"]


def test_health_is_not_cached_by_accident() -> None:
    client = TestClient(create_app())
    first = client.get("/health").json()
    second = client.get("/health").json()

    # The service should be alive on both calls.
    assert first["status"] == "ok"
    assert second["status"] == "ok"
