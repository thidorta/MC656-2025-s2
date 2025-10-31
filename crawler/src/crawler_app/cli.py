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


def _call_healthcheck(args) -> int:
    try:
        from .utils.http_session import create_session, ensure_csrf_cookie
        from .clients.gde_api import GDEClient

        base_url: str = args.base_url
        course_id: int = args.course_id
        year: int = args.year
        selected: str = args.selected
        order: int = args.order

        session = create_session()
        ensure_csrf_cookie(session, base_url)

        client = GDEClient(session=session, base_url=base_url)
        options = client.get_modalities(course_id=course_id, year=year, selected=selected, order=order)

        print(f"[OK] modalidades for c={course_id}, a={year}: {len(options)} option(s)")
        for opt in options:
            mark = " (selected)" if opt.get("selected") else ""
            print(f"- {opt['code']}: {opt['label']}{mark}")
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
    p_health = sub.add_parser("healthcheck", help="Fetch modalidades via front-end XHR endpoint")
    p_health.add_argument("--base-url", default="https://grade.daconline.unicamp.br", dest="base_url")
    p_health.add_argument("--course-id", type=int, required=True, dest="course_id", help="ex.: 34")
    p_health.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")
    p_health.add_argument("--selected", default="AA", dest="selected")
    p_health.add_argument("--order", type=int, default=1, dest="order")

    # modalities command (explicit)
    p_modal = sub.add_parser("modalities", help="List modalities via XHR HTML fragment")
    p_modal.add_argument("--base-url", default="https://grade.daconline.unicamp.br", dest="base_url")
    p_modal.add_argument("--course-id", type=int, required=True, dest="course_id", help="ex.: 34")
    p_modal.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")
    p_modal.add_argument("--selected", default="AA", dest="selected")
    p_modal.add_argument("--order", type=int, default=1, dest="order")

    # courses command (JSON preferred; HTML fallback)
    p_courses = sub.add_parser("courses", help="List courses for a given year (XHR)")
    p_courses.add_argument("--base-url", default="https://grade.daconline.unicamp.br", dest="base_url")
    p_courses.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")

    # curriculum command
    p_curr = sub.add_parser("curriculum", help="Fetch curriculum graph via arvore endpoint")
    p_curr.add_argument("--base-url", default="https://grade.daconline.unicamp.br", dest="base_url")
    p_curr.add_argument("--course-id", type=int, required=True, dest="course_id", help="ex.: 34")
    p_curr.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")
    p_curr.add_argument("--modality", default="AA", dest="modality")

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
        return _call_healthcheck(args)
    if args.cmd == "modalities":
        return _call_healthcheck(args)
    if args.cmd == "courses":
        try:
            from .utils.http_session import create_session, ensure_csrf_cookie
            from .clients.gde_api import GDEClient

            session = create_session()
            ensure_csrf_cookie(session, args.base_url)
            client = GDEClient(session=session, base_url=args.base_url)
            items = client.get_courses(year=args.year)
            # items can be a list or dict depending on server; normalize to list display
            if isinstance(items, dict) and "items" in items:
                listing = items.get("items", [])
            else:
                listing = items
            print(f"[OK] courses for a={args.year}: {len(listing)} item(s)")
            try:
                for row in listing:
                    cid = row.get("curso_id") or row.get("id") or row.get("code") or "?"
                    name = row.get("nome") or row.get("name") or row.get("label") or "?"
                    print(f"- {cid}: {name}")
            except Exception:
                # Fallback: raw print
                print(items)
            return 0
        except Exception as e:
            print(f"[courses] error: {e}", file=sys.stderr)
            return 1
    if args.cmd == "curriculum":
        try:
            from .utils.http_session import create_session, ensure_csrf_cookie
            from .clients.gde_api import GDEClient

            session = create_session()
            ensure_csrf_cookie(session, args.base_url)
            client = GDEClient(session=session, base_url=args.base_url)
            result = client.get_curriculum(course_id=args.course_id, year=args.year, modality=args.modality)
            nodes = result.get("nodes", [])
            edges = result.get("edges", [])
            print(f"[OK] curriculum for c={args.course_id}, a={args.year}, s={args.modality}: {len(nodes)} node(s), {len(edges)} edge(s)")
            # Preview first items
            for n in nodes[:5]:
                code = n.get("code")
                name = n.get("name")
                period = n.get("period")
                print(f"- node: {code} (P{period}) - {name}")
            for e in edges[:5]:
                src = e.get("src")
                dst = e.get("dst")
                etype = e.get("type")
                print(f"- edge: {src} -> {dst} ({etype})")
            return 0
        except Exception as e:
            print(f"[curriculum] error: {e}", file=sys.stderr)
            return 1

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
