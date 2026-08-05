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
        self.assertContains(response, "/static/prototype/planning.css")
        self.assertContains(response, "/static/prototype/visual-refresh.css")
        self.assertContains(response, "/static/prototype/enhancements.css")
        self.assertContains(response, "/static/prototype/enhancements.js")
        self.assertContains(response, "/static/prototype/brand-logo.svg")
        self.assertContains(response, "/static/prototype/app.js")

    def test_brand_logo_and_visual_refresh_are_connected(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        visual_styles = (static_dir / "visual-refresh.css").read_text(encoding="utf-8")
        logo = (static_dir / "brand-logo.svg").read_text(encoding="utf-8")
        self.assertIn("applyBrandLogo", script)
        self.assertIn("brand-logo.svg", script)
        self.assertIn(".brand-logo", visual_styles)
        self.assertIn(".login-card", visual_styles)
        self.assertIn("<svg", logo)

    def test_every_module_has_new_operational_features(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        for module in [
            "dashboardPanel",
            "planningPanel",
            "attendancePanel",
            "tasksPanel",
            "productivityPanel",
            "teamPanel",
            "cropPanel",
            "ticketsPanel",
            "materialsPanel",
            "reportsPanel",
        ]:
            self.assertIn(f"function {module}", enhancements)
        for action in [
            "copy-plan",
            "balance-plan",
            "attendance-reminder",
            "advance-tasks",
            "download-productivity",
            "create-protection-task",
            "assign-ticket-queue",
            "create-material-orders",
            "approve-report",
        ]:
            self.assertIn(action, enhancements)
        self.assertIn("operations-context", styles)
        self.assertIn("module-upgrade", styles)
        self.assertIn("@media (max-width: 900px)", styles)

    def test_work_completion_tracks_people_location_and_carts(self):
        script = (Path(__file__).parent / "static" / "prototype" / "app.js").read_text(encoding="utf-8")
        self.assertIn('name="people"', script)
        self.assertIn('name="nave"', script)
        self.assertIn('name="entrance"', script)
        self.assertIn('name="passageSide"', script)
        self.assertIn('name="cart"', script)
        self.assertIn("contributions", script)

    def test_greenhouse_stage_nave_ranges_and_responsibility_are_modelled(self):
        script = (Path(__file__).parent / "static" / "prototype" / "app.js").read_text(encoding="utf-8")
        for stage, nave_count in [(1, 39), (2, 40), (3, 39), (4, 36), (5, 38), (6, 37)]:
            self.assertIn(f'{{ site: "Szklarnia {stage}", stage: "{stage} etap", naveCount: {nave_count} }}', script)
        self.assertIn("data-location-naves", script)
        self.assertIn('reporter:"Anna Kowalska"', script)
        self.assertIn('source:data.get("source")', script)

    def test_crop_map_uses_full_greenhouse_location_and_audit_trail(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        styles = (static_dir / "styles.css").read_text(encoding="utf-8")
        self.assertIn("select-observation-cell", script)
        self.assertIn("Lewa od łącznika", script)
        self.assertIn("Prawa od łącznika", script)
        self.assertIn("Array.from({length:5}", script)
        self.assertIn("selectedCropNave", script)
        self.assertIn("Informacja od", script)
        self.assertIn("greenhouse-plan", styles)
        self.assertIn("observation-register", styles)

    def test_ticket_center_tracks_workflow_sla_and_history(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        styles = (static_dir / "styles.css").read_text(encoding="utf-8")
        self.assertIn("ticket-workspace", script)
        self.assertIn("ticket-source-flow", script)
        self.assertIn("ticket-step", script)
        self.assertIn("escalate-ticket", script)
        self.assertIn('name="description"', script)
        self.assertIn('name="impact"', script)
        self.assertIn("timeline", script)
        self.assertIn("ticket-timeline", styles)
        self.assertIn("ticket-progress", styles)

    def test_manager_can_edit_and_publish_a_separate_plan_for_every_site(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        planning_styles = (static_dir / "planning.css").read_text(encoding="utf-8")
        self.assertIn("selectedPlanSite", script)
        self.assertIn("planPublication", script)
        self.assertIn("select-plan-site", script)
        self.assertIn("edit-plan", script)
        self.assertIn("duplicate-plan", script)
        self.assertIn('name="instructions"', script)
        self.assertIn('name="target"', script)
        self.assertIn('name="assigned"', script)
        self.assertIn("plan-site-selector", planning_styles)
        self.assertIn("plan-card", planning_styles)

    def test_mobile_navigation_is_part_of_the_prototype(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        styles = (static_dir / "styles.css").read_text(encoding="utf-8")
        self.assertIn("mobile-bottom-nav", script)
        self.assertIn("toggle-mobile-nav", script)
        self.assertIn("@media(max-width:900px)", styles)
