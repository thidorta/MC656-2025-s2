import pytest

from app.services import gde_snapshot


def test_build_user_db_snapshot_uses_meta_cp_ratio():
    integralizacao_html = (
        "<div>"  # minimal snippet emulating GDE integralizacao section
        "Aluno: Test User "
        "Registro Academico (RA): 123456 "
        "Curso: 34 - Engenharia de Computacao Modalidade: AA "
        "Catalogo: 2022 "
        "Ingresso: 1o semestre de 2023 "
        "Limite para Integralizacao: 1o semestre de 2030 "
        "Semestre Atual : 2026 - 1.o "
        "CP : 0,8123 "
        "CPF : 0,9123 "
        "</div>"
    )

    payload = {
        "Arvore": {"integralizacao": integralizacao_html, "tipos": {}},
        "Planejado": {"periodo": 20261},
        "Oferecimentos": {},
        "Extras": [],
        "c": 4.0,  # fallback value that should NOT be used
    }

    snapshot = gde_snapshot.build_user_db_snapshot("planner-1", payload)

    assert pytest.approx(snapshot["cp"], rel=1e-5) == 0.8123
