from pathlib import Path

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render


def prototype(request, screen="login"):
    return render(request, "prototype/index.html", {"initial_screen": screen})


def manifest(request):
    return JsonResponse(
        {
            "name": "Greenhouse Manager · CITRONEX",
            "short_name": "Greenhouse",
            "description": "Plan, brygady, prace, obserwacje i raport zmiany.",
            "start_url": "/",
            "scope": "/",
            "display": "standalone",
            "background_color": "#f3f6f4",
            "theme_color": "#0b4d34",
            "icons": [
                {
                    "src": "/static/prototype/brand-logo.svg",
                    "sizes": "any",
                    "type": "image/svg+xml",
                    "purpose": "any maskable",
                }
            ],
        },
        content_type="application/manifest+json",
    )


def service_worker(request):
    path = Path(__file__).resolve().parent / "static" / "prototype" / "service-worker.js"
    return HttpResponse(path.read_text(encoding="utf-8"), content_type="application/javascript")
