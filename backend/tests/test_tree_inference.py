from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.api.endpoints import tree as tree_endpoint


def test_safe_int_parses_numeric_like_values():
    assert tree_endpoint._safe_int(10) == 10
    assert tree_endpoint._safe_int("42") == 42
    assert tree_endpoint._safe_int(None) is None
    assert tree_endpoint._safe_int("not-a-number") is None


def test_extract_modal_variants_includes_name_and_code():
    variants = tree_endpoint._extract_modal_variants("AA - Sistemas de Computacao")
    assert "AA - Sistemas de Computacao" in variants
    assert "AA" in variants


def test_parse_json_dict_handles_invalid_payloads():
    assert tree_endpoint._parse_json_dict('{"modalidade": "AA"}') == {"modalidade": "AA"}
    assert tree_endpoint._parse_json_dict("null") == {}
    assert tree_endpoint._parse_json_dict("{") == {}
