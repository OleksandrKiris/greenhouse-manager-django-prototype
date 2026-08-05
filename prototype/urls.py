from django.urls import path

from . import views

urlpatterns = [
    path("", views.prototype, {"screen": "login"}, name="login"),
    path("panel/", views.prototype, {"screen": "dashboard"}, name="dashboard"),
    path("plan/", views.prototype, {"screen": "planning"}, name="planning"),
    path("obecnosc/", views.prototype, {"screen": "attendance"}, name="attendance"),
    path("prace/", views.prototype, {"screen": "tasks"}, name="tasks"),
    path("wydajnosc/", views.prototype, {"screen": "productivity"}, name="productivity"),
    path("pracownicy/", views.prototype, {"screen": "team"}, name="team"),
    path("uprawy/", views.prototype, {"screen": "crop"}, name="crop"),
    path("usterki/", views.prototype, {"screen": "tickets"}, name="tickets"),
    path("materialy/", views.prototype, {"screen": "materials"}, name="materials"),
    path("raporty/", views.prototype, {"screen": "reports"}, name="reports"),
]
