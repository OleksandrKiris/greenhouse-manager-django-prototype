from django.urls import path

from . import views

urlpatterns = [
    path("", views.prototype, {"screen": "login"}, name="login"),
    path("panel/", views.prototype, {"screen": "dashboard"}, name="dashboard"),
    path("obecnosc/", views.prototype, {"screen": "attendance"}, name="attendance"),
    path("prace/", views.prototype, {"screen": "tasks"}, name="tasks"),
    path("wydajnosc/", views.prototype, {"screen": "productivity"}, name="productivity"),
    path("uprawy/", views.prototype, {"screen": "crop"}, name="crop"),
    path("usterki/", views.prototype, {"screen": "tickets"}, name="tickets"),
    path("raporty/", views.prototype, {"screen": "reports"}, name="reports"),
]
