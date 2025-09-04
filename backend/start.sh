#!/bin/bash

# Script para iniciar o servidor FastAPI

echo "Iniciando servidor FastAPI..."
echo "API estará disponível em: http://localhost:8000"
echo "Documentação Swagger em: http://localhost:8000/docs"
echo "Documentação ReDoc em: http://localhost:8000/redoc"

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
