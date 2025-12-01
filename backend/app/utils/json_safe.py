import json
from typing import Any

def safe_json_dumps(obj: Any) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, indent=2)
    except Exception as e:
        from .logging_setup import logger
        logger.error(f"JSON dump error: {e}")
        return "{}"
