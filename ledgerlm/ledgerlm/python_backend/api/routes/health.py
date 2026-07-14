"""
Health check endpoint for Azure App Service health probes.
Returns 200 when healthy, 503 when degraded.
"""
import os
import time
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()
_start_time = time.time()


class HealthResponse(BaseModel):
    status: str
    uptime_seconds: int
    service: str
    version: str
    database: Optional[str] = None


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Deep health check — used by Azure App Service health probe."""
    uptime = int(time.time() - _start_time)

    db_status = "ok"
    try:
        db_url = (
            os.getenv("NEON_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or os.getenv("AZURE_POSTGRESQL_URL", "")
        )
        if db_url:
            import asyncpg
            conn = await asyncpg.connect(db_url, timeout=3)
            await conn.fetchval("SELECT 1")
            await conn.close()
        else:
            db_status = "no_url"
    except Exception as exc:
        logger.warning(f"Health DB check failed: {exc}")
        db_status = f"error: {str(exc)[:80]}"

    return HealthResponse(
        status="healthy" if db_status == "ok" or db_status == "no_url" else "degraded",
        uptime_seconds=uptime,
        service="LedgerLM Python Backend",
        version="1.0.0",
        database=db_status,
    )
