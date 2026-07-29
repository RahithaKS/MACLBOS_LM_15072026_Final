"""
Azure Entra ID token fetcher for PostgreSQL Managed Identity auth.
Calls the Azure Instance Metadata Service (IMDS) — only available inside
Azure App Service / VM. Never called on Replit or local dev.

Token is cached in-process and refreshed 5 minutes before expiry.
get_entra_token() is called inside get_db_connection() so every new
psycopg2 connection gets a fresh token when needed.
"""

import time
import logging
import requests

logger = logging.getLogger(__name__)

IMDS_URL = (
    "http://169.254.169.254/metadata/identity/oauth2/token"
    "?api-version=2019-08-01"
    "&resource=https://ossrdbms-aad.database.windows.net"
)
REFRESH_BUFFER_SECONDS = 5 * 60  # refresh 5 min before expiry

_token_cache: dict = {}  # keys: token, expires_at


def get_entra_token() -> str:
    """Fetch (or return cached) Azure Entra access token for Postgres auth."""
    now = time.time()
    expires_at = _token_cache.get("expires_at", 0)

    if _token_cache.get("token") and expires_at - now > REFRESH_BUFFER_SECONDS:
        return _token_cache["token"]

    logger.info("[EntraToken] Fetching new token from Azure IMDS...")

    try:
        resp = requests.get(
            IMDS_URL,
            headers={"Metadata": "true"},
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(
            f"[EntraToken] IMDS token fetch failed: {exc}"
        ) from exc

    data = resp.json()
    _token_cache["token"] = data["access_token"]
    _token_cache["expires_at"] = int(data["expires_on"])  # unix seconds

    expires_in_min = round((_token_cache["expires_at"] - now) / 60)
    logger.info(f"[EntraToken] Token fetched. Expires in ~{expires_in_min} minutes.")

    return _token_cache["token"]


def get_token_status() -> dict:
    """Return cache state without fetching — for health/status endpoints."""
    if not _token_cache.get("token"):
        return {"cached": False}
    expires_in_s = _token_cache["expires_at"] - time.time()
    return {
        "cached": True,
        "expires_in_seconds": round(expires_in_s),
        "expires_in_minutes": round(expires_in_s / 60),
    }
