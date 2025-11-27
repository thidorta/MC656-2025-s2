import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app
client = TestClient(app)

def test_login_classes_equivalencia():
    # Inválida devido a senha incorreta
    resp = client.post("/api/v1/auth/login", json={"username": "219255", "password": "1"})
    assert resp.status_code == 401
    # Inválido devido a login inexistente
    resp = client.post("/api/v1/auth/login", json={"username": "e", "password": "1"})
    assert resp.status_code == 400
    # Login vazio
    resp = client.post("/api/v1/auth/login", json={"username": "", "password": "1"})
    assert resp.status_code == 400
    # Senha vazia
    resp = client.post("/api/v1/auth/login", json={"username": "validuser", "password": ""})
    assert resp.status_code == 400
    