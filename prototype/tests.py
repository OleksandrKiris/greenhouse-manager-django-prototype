from django.test import SimpleTestCase
from django.urls import reverse


class PrototypePageTests(SimpleTestCase):
    pages = {
        "login": "login",
        "dashboard": "dashboard",
        "planning": "planning",
        "attendance": "attendance",
        "tasks": "tasks",
        "productivity": "productivity",
        "team": "team",
        "crop": "crop",
        "tickets": "tickets",
        "materials": "materials",
        "reports": "reports",
    }

    def test_all_prototype_pages_render(self):
        for route_name, screen in self.pages.items():
            with self.subTest(route_name=route_name):
                response = self.client.get(reverse(route_name))
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'id="prototype-app"')
                self.assertContains(response, f'data-initial-screen="{screen}"')

    def test_assets_are_connected_through_django_static(self):
        response = self.client.get(reverse("login"))
        self.assertContains(response, "/static/prototype/styles.css")
        self.assertContains(response, "/static/prototype/app.js")
