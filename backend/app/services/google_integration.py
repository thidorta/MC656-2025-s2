from __future__ import annotations

import hashlib
import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import requests
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.db.repositories.oauth_token_repo import OAuthTokenRepository
from app.services import planner_service

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_EVENTS_COLLECTION_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
GOOGLE_EVENT_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"
GOOGLE_CALENDARS_URL = "https://www.googleapis.com/calendar/v3/calendars"
GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList"

_repo = OAuthTokenRepository()


class GoogleIntegrationError(Exception):
    """Base error for Google integration failures."""


class GoogleOAuthConfigError(GoogleIntegrationError):
    """Raised when Google OAuth is not properly configured."""


class GoogleOAuthNotConnectedError(GoogleIntegrationError):
    """Raised when the user has not connected a Google account."""


class GoogleCalendarSyncError(GoogleIntegrationError):
    """Raised when syncing events to Google Calendar fails."""


def exchange_authorization_code(
    session: Session,
    user_id: int,
    *,
    code: str,
    code_verifier: str,
    redirect_uri: str,
) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleOAuthConfigError("Google OAuth nao configurado.")
    if redirect_uri not in settings.google_allowed_redirects:
        raise GoogleOAuthConfigError("Redirect URI nao permitido. Atualize GOOGLE_OAUTH_ALLOWED_REDIRECTS.")

    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "code": code,
        "code_verifier": code_verifier,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    token_payload = _request_token(data)
    expires_at = _compute_expiration(token_payload.get("expires_in"))
    access_token = token_payload.get("access_token")
    if not access_token:
        raise GoogleOAuthConfigError("Resposta do Google sem access_token.")

    account_email = _fetch_account_email(access_token)
    _repo.upsert_token(
        session=session,
        user_id=user_id,
        provider="google",
        access_token=access_token,
        refresh_token=token_payload.get("refresh_token"),
        token_type=token_payload.get("token_type"),
        scope=token_payload.get("scope"),
        expires_at=expires_at,
        account_email=account_email,
    )

    return {
        "connected": True,
        "email": account_email,
        "expires_at": expires_at,
        "scope": token_payload.get("scope"),
    }


def get_connection_status(session: Session, user_id: int) -> Dict[str, Any]:
    token = _repo.get_token(session, user_id)
    if not token:
        return {"connected": False}
    return {
        "connected": True,
        "email": token.account_email,
        "scope": token.scope,
        "expires_at": token.expires_at,
    }


def disconnect_google_account(session: Session, user_id: int) -> None:
    _repo.delete_token(session, user_id)


def sync_planner_to_google_calendar(
    session: Session,
    user_id: int,
    *,
    start_date: date,
    end_date: date,
    timezone_name: Optional[str] = None,
    calendar_name: Optional[str] = None,
    calendar_id: Optional[str] = None,
) -> Dict[str, Any]:
    token = _repo.get_token(session, user_id)
    if not token:
        raise GoogleOAuthNotConnectedError("Conecte uma conta Google antes de exportar.")

    tz_name = timezone_name or planner_service.DEFAULT_TZ
    try:
        tzinfo = ZoneInfo(tz_name)
    except Exception as exc:
        raise GoogleCalendarSyncError("Fuso horario invalido.") from exc

    templates = planner_service.build_planner_event_templates(session, user_id, start_date, end_date)
    if not templates:
        raise GoogleCalendarSyncError("Nao ha eventos para sincronizar.")

    settings = get_settings()
    calendar_label = calendar_name or f"Planejamento GDE {start_date.year}"

    access_token = _ensure_access_token(session, token, settings)
    calendar_identifier = _resolve_target_calendar(
        access_token=access_token,
        explicit_calendar_id=calendar_id,
        default_calendar_id=settings.google_default_calendar_id,
        calendar_label=calendar_label,
        tz_name=tz_name,
    )

    synced = 0
    for template in templates:
        payload = _build_google_event_payload(template, tz_name, tzinfo, calendar_label)
        event_id = _build_event_id(user_id, template)
        _upsert_event(calendar_identifier, event_id, payload, access_token)
        synced += 1

    return {
        "event_count": synced,
        "calendar_id": calendar_identifier,
        "calendar_name": calendar_label,
        "connected_email": token.account_email,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def _ensure_access_token(session: Session, token, settings) -> str:
    if not token.expires_at:
        return token.access_token
    try:
        expires_dt = datetime.fromisoformat(token.expires_at)
    except ValueError:
        expires_dt = datetime.min.replace(tzinfo=timezone.utc)
    if expires_dt - timedelta(seconds=60) > datetime.now(timezone.utc):
        return token.access_token
    if not token.refresh_token:
        raise GoogleOAuthConfigError("Refresh token ausente. Refaca a conexao.")
    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "grant_type": "refresh_token",
        "refresh_token": token.refresh_token,
    }
    refreshed = _request_token(data)
    new_expires = _compute_expiration(refreshed.get("expires_in"))
    access_token = refreshed.get("access_token")
    if not access_token:
        raise GoogleOAuthConfigError("Refresh sem access_token retornado.")
    _repo.upsert_token(
        session=session,
        user_id=token.user_id,
        provider=token.provider,
        access_token=access_token,
        refresh_token=token.refresh_token,
        token_type=refreshed.get("token_type"),
        scope=refreshed.get("scope", token.scope),
        expires_at=new_expires,
        account_email=token.account_email,
    )
    return access_token


def _request_token(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        response = requests.post(GOOGLE_TOKEN_URL, data=data, timeout=15)
    except requests.RequestException as exc:
        logger.exception("[google] erro ao chamar token endpoint")
        raise GoogleOAuthConfigError(f"Falha na requisicao de token: {exc}") from exc
    if response.status_code != 200:
        raise GoogleOAuthConfigError(f"Codigo {response.status_code}: {response.text}")
    return response.json()


def _fetch_account_email(access_token: str) -> Optional[str]:
    try:
        response = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
    except requests.RequestException:
        logger.warning("[google] nao foi possivel obter userinfo")
        return None
    if response.status_code != 200:
        logger.warning("[google] userinfo retornou %s", response.status_code)
        return None
    payload = response.json()
    return payload.get("email") or payload.get("preferred_username")


def _build_google_event_payload(
    template: Dict[str, Any],
    tz_name: str,
    tzinfo: ZoneInfo,
    calendar_label: str,
) -> Dict[str, Any]:
    summary = planner_service.build_event_summary(template)
    description = planner_service.build_event_description(template)
    start_dt = datetime.combine(template["first_date"], _time_from_hour(template["start_hour"]), tzinfo=tzinfo)
    end_dt = datetime.combine(template["first_date"], _time_from_hour(template["end_hour"]), tzinfo=tzinfo)
    until_local = datetime.combine(template["last_date"], _time_from_hour(template["start_hour"]), tzinfo=tzinfo)
    recurrence_until = until_local.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    source_url = get_settings().frontend_base_url or "https://gde-app"
    payload = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": tz_name},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": tz_name},
        "recurrence": [f"RRULE:FREQ=WEEKLY;UNTIL={recurrence_until}"],
        "source": {"title": calendar_label, "url": source_url},
    }
    if template.get("location"):
        payload["location"] = str(template["location"])
    return payload


def _build_event_id(user_id: int, template: Dict[str, Any]) -> str:
    raw = "|".join(
        [
            str(user_id),
            template.get("codigo") or "",
            template.get("turma") or "",
            str(template.get("weekday")),
            str(template.get("start_hour")),
            template.get("first_date").isoformat(),
        ]
    )
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return f"gde{digest[:24]}"


def _upsert_event(calendar_id: str, event_id: str, payload: Dict[str, Any], access_token: str) -> None:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    collection_url = GOOGLE_EVENTS_COLLECTION_URL.format(calendar_id=calendar_id)
    params = {"sendUpdates": "none", "supportsAttachments": "false", "eventId": event_id}
    try:
        response = requests.post(collection_url, params=params, json=payload, headers=headers, timeout=20)
    except requests.RequestException as exc:
        raise GoogleCalendarSyncError(f"Falha ao criar evento: {exc}") from exc
    if response.status_code == 409:
        update_url = GOOGLE_EVENT_URL.format(calendar_id=calendar_id, event_id=event_id)
        try:
            response = requests.put(update_url, params={"sendUpdates": "none"}, json=payload, headers=headers, timeout=20)
        except requests.RequestException as exc:
            raise GoogleCalendarSyncError(f"Falha ao atualizar evento: {exc}") from exc
    if response.status_code not in (200, 201):
        raise GoogleCalendarSyncError(f"Google Calendar retornou {response.status_code}: {response.text}")


def _resolve_target_calendar(
    *,
    access_token: str,
    explicit_calendar_id: Optional[str],
    default_calendar_id: Optional[str],
    calendar_label: str,
    tz_name: str,
) -> str:
    if explicit_calendar_id:
        return explicit_calendar_id
    if default_calendar_id:
        return default_calendar_id
    return _get_or_create_secondary_calendar(access_token, calendar_label, tz_name)


def _get_or_create_secondary_calendar(access_token: str, calendar_label: str, tz_name: str) -> str:
    existing = _find_calendar_by_summary(access_token, calendar_label)
    if existing:
        return existing
    return _create_secondary_calendar(access_token, calendar_label, tz_name)


def _find_calendar_by_summary(access_token: str, calendar_label: str) -> Optional[str]:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    page_token: Optional[str] = None
    while True:
        params = {"minAccessRole": "writer"}
        if page_token:
            params["pageToken"] = page_token
        try:
            response = requests.get(GOOGLE_CALENDAR_LIST_URL, headers=headers, params=params, timeout=20)
        except requests.RequestException as exc:
            raise GoogleCalendarSyncError(f"Falha ao listar agendas: {exc}") from exc
        if response.status_code != 200:
            raise GoogleCalendarSyncError(
                f"Listagem de agendas retornou {response.status_code}: {response.text}"
            )
        payload = response.json()
        for calendar in payload.get("items", []):
            if calendar.get("summary") == calendar_label:
                return calendar.get("id")
        page_token = payload.get("nextPageToken")
        if not page_token:
            break
    return None


def _create_secondary_calendar(access_token: str, calendar_label: str, tz_name: str) -> str:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = {"summary": calendar_label, "timeZone": tz_name}
    try:
        response = requests.post(GOOGLE_CALENDARS_URL, headers=headers, json=data, timeout=20)
    except requests.RequestException as exc:
        raise GoogleCalendarSyncError(f"Falha ao criar agenda secundaria: {exc}") from exc
    if response.status_code not in (200, 201):
        raise GoogleCalendarSyncError(
            f"Criacao de agenda retornou {response.status_code}: {response.text}"
        )
    payload = response.json()
    calendar_id = payload.get("id")
    if not calendar_id:
        raise GoogleCalendarSyncError("Resposta do Google sem ID da agenda criada.")
    return calendar_id


def _time_from_hour(hour_value: int) -> time:
    return time(hour=max(0, min(23, hour_value)), minute=0)


def _compute_expiration(expires_in: Any) -> Optional[str]:
    try:
        seconds = int(expires_in)
    except (TypeError, ValueError):
        return None
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat()
