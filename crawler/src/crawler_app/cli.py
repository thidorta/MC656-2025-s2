from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _call_collect() -> int:
    try:
        from .collectors.enumerate_dimensions import main as collect_main
        collect_main()
        return 0
    except Exception as e:
        print(f"[collect] error: {e}", file=sys.stderr)
        return 1


def _call_build_db() -> int:
    try:
        from .tools.build_simple_db import main as build_db_main
        build_db_main()
        return 0
    except Exception as e:
        print(f"[build-db] error: {e}", file=sys.stderr)
        return 1


def _call_healthcheck() -> int:
    try:
        print("healthcheck (stub): session and GDEClient will be validated later.")
        return 0
    except Exception as e:
        print(f"[healthcheck] error: {e}", file=sys.stderr)
        return 1

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="crawler_app", description="Crawler CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("collect", help="Run data collection (HTML + JSON)")
    sub.add_parser("build-db", help="Build SQLite DB from JSON")
    sub.add_parser("run-all", help="Collect then build DB")
    sub.add_parser("healthcheck", help="Sanity check for session and GDEClient (stub)")

    args = parser.parse_args(argv)
    if args.cmd == "collect":
        return _call_collect()
    if args.cmd == "build-db":
        return _call_build_db()
    if args.cmd == "run-all":
        rc = _call_collect()
        if rc != 0:
            return rc
        return _call_build_db()
    if args.cmd == "healthcheck":
        return _call_healthcheck()

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
