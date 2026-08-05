from pathlib import Path

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

    def test_work_completion_tracks_people_rows_and_carts(self):
        script = (Path(__file__).parent / "static" / "prototype" / "app.js").read_text(encoding="utf-8")
        self.assertIn('name="people"', script)
        self.assertIn('name="row"', script)
        self.assertIn('name="cart"', script)
        self.assertIn("contributions", script)

    def test_mobile_navigation_is_part_of_the_prototype(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        styles = (static_dir / "styles.css").read_text(encoding="utf-8")
        self.assertIn("mobile-bottom-nav", script)
        self.assertIn("toggle-mobile-nav", script)
        self.assertIn("@media(max-width:900px)", styles)
