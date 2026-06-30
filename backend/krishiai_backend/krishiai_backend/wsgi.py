"""
WSGI entrypoint for production servers (gunicorn, uWSGI, etc).

Run in production with, e.g.:
    gunicorn krishiai_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3

Do NOT use `python manage.py runserver` in production — it is single-threaded,
auto-reloads on file changes, and is explicitly documented by Django as
unsuitable for anything beyond local development.
"""
import os

from django.core.wsgi import get_wsgi_application

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "krishiai_backend.settings")
application = get_wsgi_application()
