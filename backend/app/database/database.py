import logging
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from ..config.settings import settings

logger = logging.getLogger(__name__)


def _make_engine(url: str):
    return create_engine(
        url,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,
        echo=False,  # echo=True caused duplicate log lines (echo handler + root logger)
        connect_args={"connect_timeout": 5},
    )


def _build_engine():
    """
    Try DATABASE_URL (Render) first, with a short connect timeout so a dead
    host doesn't hang startup. If it can't be reached, fall back to
    DATABASE_URL_FALLBACK (your local Postgres) so the app still runs.

    This check only runs once, at process startup — it doesn't hot-switch
    mid-session if Render goes down while the app is already running.
    Restart the app to re-check and reconnect.
    """
    primary_engine = _make_engine(settings.DATABASE_URL)
    try:
        with primary_engine.connect():
            pass
        logger.info("Connected to primary database (DATABASE_URL)")
        return primary_engine
    except OperationalError as e:
        logger.warning(f"Primary database unreachable, falling back to local DB: {e}")
        primary_engine.dispose()

    if not settings.DATABASE_URL_FALLBACK:
        logger.error("No DATABASE_URL_FALLBACK configured — cannot fall back")
        raise OperationalError("Primary database unreachable and no fallback configured", None, None)

    fallback_engine = _make_engine(settings.DATABASE_URL_FALLBACK)
    try:
        with fallback_engine.connect():
            pass
        logger.info("Connected to fallback database (DATABASE_URL_FALLBACK)")
        return fallback_engine
    except OperationalError as e:
        logger.error(f"Fallback database also unreachable: {e}")
        raise


# Create SQLAlchemy engine — tries the primary DB, falls back to local if it's down
engine = _build_engine()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Ensures session is closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database - create all tables.
    Should be called on application startup.
    """
    Base.metadata.create_all(bind=engine)

