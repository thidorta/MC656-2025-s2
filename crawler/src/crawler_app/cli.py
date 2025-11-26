from __future__ import annotations

import argparse
import os
import sys
from dataclasses import replace
from pathlib import Path
from typing import Iterable, List, Optional

from dotenv import load_dotenv

from .clients.gde_api import Curriculum, CurriculumNode, GDEApiClient
from .collectors.config import CP_TARGET, PERIODO_TARGET
from .collectors.enumerate_pipeline import fetch_with_strategy
from .config.settings import CrawlerSettings
from .parsers.arvore_parsers import parse_disciplinas_from_integralizacao
from .types import CurriculumParams
from .utils.http_session import build_session, ensure_csrf_cookie, login_via_ajax


ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH.as_posix(), override=False)
else:
    load_dotenv(override=False)


def _ensure_trailing_slash(url: str) -> str:
    return url if url.endswith("/") else url + "/"


def _normalize_base_url(url: str) -> str:
    return url.rstrip("/")


DEFAULT_BASE_URL = _ensure_trailing_slash(CrawlerSettings().base_url)


def _resolve_settings(base_url: Optional[str], strategy: Optional[str]) -> CrawlerSettings:
    settings = CrawlerSettings()
    updates: dict[str, object] = {}
    if base_url:
        updates["base_url"] = _normalize_base_url(base_url)
    if strategy:
        updates["strategy"] = strategy
    if updates:
        settings = replace(settings, **updates)
    return settings


def _call_collect() -> int:
    try:
        from .collectors.enumerate_dimensions import main as collect_main

        collect_main()
        return 0
    except Exception as exc:  # pragma: no cover - CLI surface
        print(f"[collect] error: {exc}", file=sys.stderr)
        return 1


def _call_build_db() -> int:
    try:
        from .tools.build_simple_db import main as build_db_main

        build_db_main()
        return 0
    except Exception as exc:  # pragma: no cover - CLI surface
        print(f"[build-db] error: {exc}", file=sys.stderr)
        return 1


def _build_session(settings: CrawlerSettings):
    session = build_session(settings)

    base_url = settings.base_url
    ensure_csrf_cookie(session, base_url)

    username = os.getenv("GDE_USERNAME") or os.getenv("GDE_LOGIN")
    password = os.getenv("GDE_PASSWORD") or os.getenv("GDE_SENHA")
    csrf_token = os.getenv("GDE_CSRF") or None

    if username and password:
        try:
            login_via_ajax(session, base_url, username, password, csrf=csrf_token)
        except Exception as exc:
            print(f"[warn] login failed: {exc}", file=sys.stderr)

    return session


def _build_client(settings: CrawlerSettings):
    session = _build_session(settings)
    return GDEApiClient(base_url=_ensure_trailing_slash(settings.base_url), session=session)


def _print_modalities(modalities, course_id: int, year: int, expected_selected: Optional[str] = None) -> None:
    print(f"[OK] modalidades for c={course_id}, a={year}: {len(modalities)} option(s)")
    for modality in modalities:
        code = modality.code
        selected = modality.selected or (expected_selected is not None and code == expected_selected)
        suffix = " (selected)" if selected else ""
        print(f"- {code}: {modality.label}{suffix}")


def _print_courses(courses, year: int) -> None:
    print(f"[OK] courses for a={year}: {len(courses)} item(s)")
    for course in courses[:10]:
        code = course.code or course.name
        print(f"- {course.id}: {course.name}{' [' + code + ']' if course.code else ''}")


def _print_offers(offers, course_id: int, year: int) -> None:
    print(f"[OK] offers for c={course_id}, a={year}: {len(offers)} item(s)")
    for offer in offers[:10]:
        slot = " ".join(filter(None, [offer.term, offer.class_id]))
        print(f"- {offer.course_code}: {slot or 'n/a'}")


def _print_curriculum(curriculum, course_id: int, year: int) -> None:
    print(
        f"[OK] curriculum for c={course_id}, a={year}: {len(curriculum.nodes)} node(s), {len(curriculum.edges)} edge(s)"
    )
    for node in curriculum.nodes[:5]:
        print(f"- node: {node.code} (P{node.period}) - {node.name}")
    for edge in curriculum.edges[:5]:
        print(f"- edge: {edge.src} -> {edge.dst} ({edge.type})")


def _print_prereqs(prereqs, course_id: int, year: int) -> None:
    print(f"[OK] prereqs for c={course_id}, a={year}: {len(prereqs)} item(s)")
    for item in prereqs[:10]:
        print(f"- {item.course_code}: requires {', '.join(item.requirements) if item.requirements else 'none'}")


def _print_semester_map(sem_map, course_id: int, year: int) -> None:
    print(f"[OK] semester-map for c={course_id}, a={year}: {len(sem_map.entries)} item(s)")
    for entry in sem_map.entries[:10]:
        print(f"- {entry.code}: semester {entry.recommended_semester}")


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="crawler_app", description="Crawler CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("collect", help="Run data collection (HTML + JSON)")
    sub.add_parser("build-db", help="Build SQLite DB from JSON")
    sub.add_parser("run-all", help="Collect then build DB")

    def _add_base(parser_: argparse.ArgumentParser) -> None:
        parser_.add_argument("--base-url", default=DEFAULT_BASE_URL, dest="base_url")

    p_health = sub.add_parser("healthcheck", help="Alias for modalities (backward compatibility)")
    _add_base(p_health)
    p_health.add_argument("--course-id", type=int, required=True, dest="course_id", help="ex.: 34")
    p_health.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")
    p_health.add_argument("--selected", default=None, dest="selected")
    p_health.add_argument("--order", type=int, default=1, dest="order")

    p_modal = sub.add_parser("modalities", help="List modalities via API/XHR")
    _add_base(p_modal)
    p_modal.add_argument("--course-id", type=int, required=True, dest="course_id", help="ex.: 34")
    p_modal.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")
    p_modal.add_argument("--selected", default=None, dest="selected")
    p_modal.add_argument("--order", type=int, default=1, dest="order")

    p_courses = sub.add_parser("courses", help="List courses for a given year (API)")
    _add_base(p_courses)
    p_courses.add_argument("--year", type=int, required=True, dest="year", help="ex.: 2022")

    p_offers = sub.add_parser("offers", help="List offers for a course/year (API)")
    _add_base(p_offers)
    p_offers.add_argument("--year", type=int, required=True, dest="year")
    p_offers.add_argument("--course-id", type=int, required=True, dest="course_id")

    p_curr = sub.add_parser("curriculum", help="Fetch curriculum graph")
    _add_base(p_curr)
    p_curr.add_argument("--year", type=int, required=True, dest="year")
    p_curr.add_argument("--course-id", type=int, required=True, dest="course_id")
    p_curr.add_argument("--modalidade", default=None, dest="modalidade")
    p_curr.add_argument("--periodo", default=PERIODO_TARGET, dest="periodo")
    p_curr.add_argument("--cp", default=CP_TARGET, dest="cp")
    p_curr.add_argument(
        "--strategy",
        choices=["ajax", "full", "auto"],
        default=None,
        dest="strategy",
    )

    p_pre = sub.add_parser("prereqs", help="Fetch prerequisites map")
    _add_base(p_pre)
    p_pre.add_argument("--year", type=int, required=True, dest="year")
    p_pre.add_argument("--course-id", type=int, required=True, dest="course_id")

    p_sem = sub.add_parser("semester-map", help="Fetch semester recommendation map")
    _add_base(p_sem)
    p_sem.add_argument("--year", type=int, required=True, dest="year")
    p_sem.add_argument("--course-id", type=int, required=True, dest="course_id")

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

    base_url_arg = _normalize_base_url(args.base_url)
    strategy_arg = getattr(args, "strategy", None)
    settings = _resolve_settings(base_url_arg, strategy_arg)
    client = _build_client(settings)
    base_url = _ensure_trailing_slash(settings.base_url)

    try:
        if args.cmd in {"modalities", "healthcheck"}:
            modalities = client.get_modalities(year=args.year, course_id=args.course_id)
            _print_modalities(modalities, course_id=args.course_id, year=args.year, expected_selected=args.selected)
            return 0
        if args.cmd == "courses":
            courses = client.get_courses(year=args.year)
            _print_courses(courses, year=args.year)
            return 0
        if args.cmd == "offers":
            offers = client.get_offers(year=args.year, course_id=args.course_id)
            _print_offers(offers, course_id=args.course_id, year=args.year)
            return 0
        if args.cmd == "curriculum":
            session = client.session
            modality_code = args.modalidade
            if modality_code is None:
                modalities = client.get_modalities(year=args.year, course_id=args.course_id)
                modality_code = next((m.code for m in modalities if getattr(m, "selected", False)), None)
                if not modality_code and modalities:
                    modality_code = modalities[0].code
            modality_code = modality_code or "UNICA"

            params = CurriculumParams(
                curso_id=int(args.course_id),
                catalogo_id=int(args.year),
                modalidade_id=str(modality_code),
                periodo_id=str(args.periodo),
                cp=str(args.cp),
            )

            raw_path = fetch_with_strategy(session, settings, params, settings.out_dir)
            html = Path(raw_path).read_text(encoding="utf-8")
            parsed = parse_disciplinas_from_integralizacao(html, catalogo=str(params.catalogo_id))

            nodes = [
                CurriculumNode(
                    code=str(item.get("codigo") or item.get("disciplina_id") or "").strip(),
                    name=str(item.get("nome") or item.get("codigo") or "").strip(),
                    period=int(item.get("semestre") or 0) if str(item.get("semestre") or "").isdigit() else 0,
                    category=(str(item.get("tipo") or "").strip() or None),
                )
                for item in parsed
                if item.get("codigo")
            ]

            curriculum = Curriculum(
                course_id=params.curso_id,
                year=params.catalogo_id,
                modality=modality_code,
                nodes=nodes,
                edges=[],
            )

            _print_curriculum(curriculum, course_id=params.curso_id, year=params.catalogo_id)
            return 0
        if args.cmd == "prereqs":
            prereqs = client.get_prereqs(course_id=args.course_id, year=args.year)
            _print_prereqs(prereqs, course_id=args.course_id, year=args.year)
            return 0
        if args.cmd == "semester-map":
            sem_map = client.get_semester_map(course_id=args.course_id, year=args.year)
            _print_semester_map(sem_map, course_id=args.course_id, year=args.year)
            return 0
    except Exception as exc:
        print(f"[{args.cmd}] error: {exc}", file=sys.stderr)
        return 1

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

