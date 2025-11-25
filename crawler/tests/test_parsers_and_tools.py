from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

# Ensure src is on path
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from crawler_app.collectors.enumerate_pipeline import fetch_with_strategy  # type: ignore
from crawler_app.collectors.strategies import ajax_strategy, fullpage_strategy  # type: ignore
from crawler_app.config.settings import CrawlerSettings  # type: ignore
from crawler_app.parsers import arvore_parsers  # type: ignore
from crawler_app.tools import build_simple_db  # type: ignore


class ParserTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixtures = ROOT.parent / "data" / "fixtures"

    def test_parse_courses_from_fixture(self) -> None:
        html_path = self.fixtures / "html" / "courses_select_a2022.html"
        html = html_path.read_text(encoding="utf-8")
        courses = arvore_parsers.parse_courses_from_arvore(html)
        self.assertEqual(len(courses), 15)
        ids = {c["curso_id"] for c in courses}
        self.assertIn("34", ids)
        self.assertIn("109", ids)

    def test_parse_modalidades_from_fragment(self) -> None:
        frag_path = self.fixtures / "html" / "modalidades_c34_a2022.html"
        html = frag_path.read_text(encoding="utf-8")
        modalidades = arvore_parsers.parse_modalidades_from_fragment(html)
        codes = [m["modalidade_id"] for m in modalidades]
        self.assertEqual(codes, ["AA", "AB", "AX"])

    def test_parse_disciplinas_from_integralizacao(self) -> None:
        html = """
        <div id="integralizacao">
          <pre>
            <strong>Disciplinas Obrigatorias:</strong>
            <a class="sigla" href="/disciplina/100/MC001/" title="Algoritmos">MC001</a> (4)

            <strong>Disciplinas Eletivas:</strong>
            <a class="sigla" href="/disciplina/200/MC999/" title="Topicos">MC999</a> (2)
          </pre>
        </div>
        """
        parsed = arvore_parsers.parse_disciplinas_from_integralizacao(html, catalogo="2025")
        codes = {item["codigo"] for item in parsed}
        self.assertIn("MC001", codes)
        self.assertIn("MC999", codes)
        obrig = next(item for item in parsed if item["codigo"] == "MC001")
        elet = next(item for item in parsed if item["codigo"] == "MC999")
        self.assertEqual(obrig["semestre"], 1)
        self.assertIsNone(elet["semestre"])


class StrategyTests(unittest.TestCase):
    def test_fetch_with_strategy_fallbacks_to_full_page(self) -> None:
        settings = CrawlerSettings()
        from crawler_app.types import CurriculumParams  # type: ignore

        dummy_params = CurriculumParams(curso_id=1, catalogo_id=2025, modalidade_id="AA", periodo_id="20251", cp="1")

        with tempfile.TemporaryDirectory() as tmpdir:
            html_path = Path(tmpdir) / "dummy.html"
            html_path.write_text("<html>ok</html>", encoding="utf-8")

            with mock.patch.object(ajax_strategy.AjaxStrategy, "fetch", side_effect=RuntimeError("fail")), mock.patch.object(
                fullpage_strategy.FullPageStrategy, "fetch", return_value=str(html_path)
            ):
                saved_path = fetch_with_strategy(None, settings, dummy_params, tmpdir)
                self.assertEqual(Path(saved_path), html_path)


class BuildSimpleDbTests(unittest.TestCase):
    def test_build_simple_db_creates_tables(self) -> None:
        payload = {
            "curso": "Curso Teste",
            "numero_curso": 123,
            "catalogo": 2025,
            "modalidade": "AA",
            "periodo": "20251",
            "disciplinas": [
                {
                    "disciplina_id": 999,
                    "codigo": "MC101",
                    "nome": "Algoritmos",
                    "creditos": 4,
                    "tipo": "obrigatoria",
                    "semestre": 1,
                }
            ],
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_json_dir = Path(tmpdir) / "json"
            tmp_json_dir.mkdir(parents=True, exist_ok=True)
            json_path = tmp_json_dir / "payload.json"
            json_path.write_text(build_simple_db.json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

            tmp_db_dir = Path(tmpdir) / "db"
            tmp_db_path = tmp_db_dir / "gde_simple.db"

            with mock.patch.object(build_simple_db, "JSON_DIR", tmp_json_dir), mock.patch.object(
                build_simple_db, "DB_DIR", tmp_db_dir
            ), mock.patch.object(build_simple_db, "DB_PATH", tmp_db_path):
                build_simple_db.main()

            conn = sqlite3.connect(tmp_db_path)
            try:
                cur = conn.execute("SELECT COUNT(*) FROM gde_cursos")
                self.assertEqual(cur.fetchone()[0], 1)
                cur = conn.execute("SELECT COUNT(*) FROM gde_disciplinas")
                self.assertEqual(cur.fetchone()[0], 1)
                cur = conn.execute("SELECT COUNT(*) FROM gde_cursos_disciplinas")
                self.assertEqual(cur.fetchone()[0], 1)
            finally:
                conn.close()


if __name__ == "__main__":
    unittest.main()
