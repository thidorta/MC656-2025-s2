#!/bin/bash
# Script para rodar o crawler coletando TODOS os cursos

echo "🚀 Iniciando coleta de TODOS os cursos..."
echo ""

# 1) Gera os JSONs
echo "📥 Passo 1/2: Coletando dados de todos os cursos..."
python -m src.collectors.enumerate_dimensions

if [ $? -ne 0 ]; then
    echo "❌ Erro ao coletar dados!"
    exit 1
fi

echo ""
echo "✅ Coleta finalizada!"
echo ""

# 2) Constrói o banco de dados
echo "💾 Passo 2/2: Construindo banco de dados SQLite..."
python -m src.tools.build_simple_db

if [ $? -ne 0 ]; then
    echo "❌ Erro ao construir banco de dados!"
    exit 1
fi

echo ""
echo "🎉 Processo completo! Verifique a pasta outputs/"
echo ""
echo "📊 Outputs gerados:"
echo "  • outputs/json/        - JSONs por curso/modalidade"
echo "  • outputs/gde_simple.db - Banco SQLite"
echo "  • outputs/raw/         - HTMLs brutos"
