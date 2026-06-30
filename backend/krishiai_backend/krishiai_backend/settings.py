"""
krishiai_backend/settings.py
============================
Django settings for KrishiAI backend.

PRODUCTION CONFIG VIA ENVIRONMENT VARIABLES
---------------------------------------------
This file reads its security-sensitive values from environment variables so the
same codebase can run safely in local dev and in production without code changes.

Required in production (set these in your host's environment / dashboard):
    DJANGO_SECRET_KEY       - a long random string (see "How to generate" below)
    DJANGO_DEBUG             - "False"
    DJANGO_ALLOWED_HOSTS     - comma-separated, e.g. "api.krishiai.com"
    CORS_ALLOWED_ORIGINS     - comma-separated, e.g. "https://krishiai.com,https://www.krishiai.com"

How to generate a new SECRET_KEY:
    python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

NOTE: The previous SECRET_KEY in this repo was committed to a public GitHub
history and must be treated as compromised. Generate a fresh one before deploy.
"""

import os
from pathlib import Path
from dotenv import load_dotenv 
 
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

def _env_list(name: str, default: str = "") -> list:
    """Parse a comma-separated environment variable into a clean list of strings."""
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


# ─── Security ────────────────────────────────────────────────────────────────
# Falls back to a clearly-marked insecure dev key ONLY when no env var is set,
# and refuses to start with that dev key if DEBUG is off (see check below).
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-DO-NOT-USE-IN-PRODUCTION",
)

DEBUG = _env_bool("DJANGO_DEBUG", default=True)

if not DEBUG and SECRET_KEY == "django-insecure-dev-only-DO-NOT-USE-IN-PRODUCTION":
    raise RuntimeError(
        "DJANGO_DEBUG is False but DJANGO_SECRET_KEY is not set. "
        "Refusing to start with an insecure key in production. "
        "Set the DJANGO_SECRET_KEY environment variable."
    )

# In dev, "*" is convenient. In production, set DJANGO_ALLOWED_HOSTS explicitly.
ALLOWED_HOSTS = _env_list("DJANGO_ALLOWED_HOSTS", default="*" if DEBUG else "")

# ─── Installed Apps ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "predictor",
    "corsheaders",
]

try:
    import django_ratelimit  # noqa: F401

    INSTALLED_APPS.append("django_ratelimit")
except ImportError:
    # Optional dependency — predictor/views.py already fails open (no rate
    # limiting applied) if this package isn't installed. See requirements.txt.
    pass

# ─── Middleware ─────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    # NOTE: CsrfViewMiddleware is intentionally excluded — this is a stateless
    # JSON API with no cookie-based sessions. Add it back if you add
    # server-rendered forms or session auth.
]

# ─── CORS (single source of truth — do not also set headers manually in views) ──
# In dev (DEBUG=True) we allow all origins for convenience.
# In production, only the explicit origins below are allowed.
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS"]
CORS_ALLOW_HEADERS = ["content-type", "authorization"]

# ─── Security headers (only meaningful once served over HTTPS) ─────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT = _env_bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7  # 1 week; raise once confident
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # If deployed behind a proxy/load balancer that terminates TLS (Render,
    # Railway, Heroku-style platforms), this tells Django the original
    # request was HTTPS even though it arrives as HTTP from the proxy.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ─── URL Configuration ────────────────────────────────────────────────────────
ROOT_URLCONF = "krishiai_backend.urls"

# ─── Database ───────────────────────────────────────────────────────────────────
# Stateless API today (no models persisted) — SQLite is fine for local dev.
# If you add user accounts / saved predictions, switch to Postgres via
# DATABASE_URL before going to production; SQLite does not handle concurrent
# writes well under real traffic.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ─── Static Files ───────────────────────────────────────────────────────────────
STATIC_URL = "/static/"

# ─── Internationalisation ────────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Cache (used by django-ratelimit for /predict throttling) ──────────────────
# LocMemCache works for a single-process dev server or a single-worker
# deployment. If you run multiple gunicorn workers or multiple instances in
# production, rate limits won't be shared across them with LocMemCache — point
# CACHE_URL at Redis (e.g. "redis://localhost:6379/1") for accurate
# cross-process/cross-instance limiting.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "krishiai-ratelimit-cache",
    }
}
# django-ratelimit warns that LocMemCache isn't officially supported because
# it isn't shared across processes — acceptable tradeoff for now; see note
# above for the Redis upgrade path once running multiple workers.
SILENCED_SYSTEM_CHECKS = ["django_ratelimit.E003"]

# ─── Rate limiting (django-ratelimit reads this; see predictor/views.py) ────────
RATELIMIT_ENABLE = _env_bool("DJANGO_RATELIMIT_ENABLE", default=True)
# Requests allowed per IP for the /predict endpoint, e.g. "30/m" = 30 per minute.
PREDICT_RATE_LIMIT = os.environ.get("PREDICT_RATE_LIMIT", "30/m")

# ─── Logging ────────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "predictor": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
