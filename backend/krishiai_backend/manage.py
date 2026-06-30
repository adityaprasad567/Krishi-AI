#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Load .env for local dev if python-dotenv is available; in production,
    # env vars are normally set by the hosting platform directly and this
    # is a harmless no-op.
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "krishiai_backend.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed? "
            "Run: pip install -r requirements.txt"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
