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

def test_courses_endpoints():
    # Testa listagem de cursos
    resp = client.get("/api/v1/courses/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Testa obtenção de curso por ID existente
    resp = client.get("/api/v1/courses/100")
    assert resp.status_code == 200
    assert resp.json()["id"] == 100

    # Testa obtenção de curso por ID inexistente
    resp = client.get("/api/v1/courses/9999")
    assert resp.status_code == 404

    # Testa criação de curso (deve falhar com 405)
    resp = client.post("/api/v1/courses/", json={"codigo": "NEW101", "nome": "New Course"})
    assert resp.status_code == 405
    
