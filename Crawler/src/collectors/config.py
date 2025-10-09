from __future__ import annotations


# Base URL
BASE = "https://grade.daconline.unicamp.br"


# Defaults
CATALOGO_TARGET = "2022" # Catálogo padrão (você pode alterar para coletar outros catálogos)
PERIODO_TARGET = "20251" # 2025 - 1º semestre
CP_TARGET = "1" # Completa=Sim

# Modo de coleta
COLLECT_ALL_COURSES = True  # True = todos os cursos, False = apenas CURSO_TARGET
CURSO_TARGET = "34" # Usado apenas se COLLECT_ALL_COURSES = False