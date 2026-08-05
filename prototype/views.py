from django.shortcuts import render


def prototype(request, screen="login"):
    return render(request, "prototype/index.html", {"initial_screen": screen})
