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
        self.assertContains(response, "/static/prototype/hydra-features.css")
        self.assertContains(response, "/static/prototype/frontend-v2.css")
        self.assertContains(response, "/static/prototype/ux-v3.css")
        self.assertContains(response, "/static/prototype/visual-system-v4.css")
        self.assertContains(response, "/static/prototype/enhancements.js")
        self.assertContains(response, "/static/prototype/hydra-features.js")
        self.assertContains(response, "/static/prototype/ux-v3.js")
        self.assertContains(response, "/static/prototype/visual-system-v4.js")
        self.assertContains(response, "/static/prototype/brand-logo.svg")
        self.assertContains(response, "/static/prototype/app.js")
        self.assertContains(response, "/manifest.webmanifest")
        self.assertContains(response, 'data-service-worker-url="/sw.js"')

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
            "acknowledge-plan",
            "attendance-reminder",
            "advance-tasks",
            "download-tasks",
            "check-productivity",
            "download-productivity",
            "download-team",
            "create-protection-task",
            "assign-ticket-queue",
            "create-material-orders",
            "approve-report",
        ]:
            self.assertIn(action, enhancements)
        self.assertIn("operations-context", styles)
        self.assertIn("module-upgrade", styles)
        self.assertIn("@media (max-width: 900px)", styles)

    def test_role_scope_permissions_and_personal_focus_are_explicit(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        self.assertIn("function roleTasks()", script)
        self.assertIn("function roleTickets()", script)
        self.assertIn("function roleObservations()", script)
        self.assertIn("function roleNotifications()", script)
        self.assertIn("roleTasks()", script)
        self.assertIn("roleTickets()", script)
        self.assertIn("const roleProfiles", enhancements)
        self.assertIn("const screensByRole", enhancements)
        self.assertIn("function applyRolePermissions()", enhancements)
        self.assertIn("forbiddenActions", enhancements)
        self.assertIn("Tylko do odczytu", enhancements)
        self.assertIn("role-focus-panel", styles)
        self.assertIn("read-only-note", styles)

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
        self.assertIn("const mobileScreens", script)
        self.assertIn("toggle-mobile-nav", script)
        self.assertNotIn('class="journey"', script)
        self.assertIn("@media(max-width:900px)", styles)

    def test_flexible_work_time_and_design_review_tools_are_modelled(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        self.assertIn("function totalWorkedHours()", script)
        for marker in [
            "employeeNetMinutes",
            "data-break-count",
            "data-break-start",
            "data-break-minutes",
            "save-schedule",
            "designStudioPanel",
            "data-design-decision",
            "data-design-add-form",
            "projekt-zmian-makiety.json",
        ]:
            self.assertIn(marker, enhancements)
        for class_name in ["time-worker-card", "design-studio", "design-block-toolbar"]:
            self.assertIn(class_name, styles)

    def test_each_screen_has_an_isolated_operational_scope(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        self.assertIn("review: false", script)
        self.assertIn("const taskOrder", script)
        self.assertIn("const ticketPriority", script)
        self.assertIn("const screenDefinitions", enhancements)
        self.assertIn("function screenScopePanel()", enhancements)
        self.assertIn('TEN WIDOK ZAWIERA TYLKO', enhancements)
        self.assertIn('? roleFocusPanel() : screenScopePanel()', enhancements)
        self.assertIn("module-scope", styles)
        for screen in self.pages.values():
            if screen != "login":
                self.assertIn(f"{screen}:", enhancements)

    def test_specialist_roles_only_receive_their_own_navigation_modules(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        plant_scope = '["dashboard", "crop", "materials", "reports"]'
        technical_scope = '["dashboard", "tickets", "materials", "reports"]'
        hr_scope = '["dashboard", "attendance", "team", "reports"]'
        for scope in [plant_scope, technical_scope, hr_scope]:
            self.assertIn(scope, script)
            self.assertIn(scope, enhancements)

    def test_hydra_inspired_start_panel_keeps_only_primary_dashboard_actions(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        self.assertIn("hydra-start-panel", enhancements)
        self.assertIn("Najpierw wybierz, czego potrzebujesz", enhancements)
        self.assertIn("function simplifyDashboard()", enhancements)
        self.assertIn("hydra-action-grid", styles)
        self.assertIn("System wizualny inspirowany CITRONEX Hydra", styles)

    def test_attendance_is_compact_and_first_break_has_fifteen_paid_minutes(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        self.assertIn("paidFirstBreakMinutes", script)
        self.assertIn("function breakAccounting(employee)", enhancements)
        self.assertIn('details class="time-worker-card', enhancements)
        self.assertIn("pierwsze 15 minut pierwszej przerwy", enhancements)
        self.assertIn(".time-worker-card > summary", styles)
        self.assertIn(".time-worker-details", styles)

    def test_each_greenhouse_has_fifty_to_sixty_people_split_between_foremen(self):
        script = (Path(__file__).parent / "static" / "prototype" / "app.js").read_text(encoding="utf-8")
        for people in [56, 54, 59, 52, 57, 55]:
            self.assertIn(f"people:{people}", script)
        self.assertIn("const greenhouseEmployeeCount", script)
        self.assertIn("const supportEmployeeCount", script)
        self.assertIn("Brygady w szklarni", script)
        self.assertIn("team.people", script)

    def test_large_lists_are_compact_progressive_and_mobile_friendly(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "enhancements.css").read_text(encoding="utf-8")
        self.assertIn("const largeListDefinitions", enhancements)
        self.assertIn("function renderLargeListControls()", enhancements)
        self.assertIn("function applyListWindow()", enhancements)
        for action in ["show-more-list", "show-all-list", "collapse-large-list", "set-list-density"]:
            self.assertIn(action, enhancements)
        for screen in ["planning", "attendance", "tasks", "productivity", "team", "crop", "tickets", "materials", "reports"]:
            self.assertIn(f"{screen}:", enhancements)
        self.assertIn("large-list-toolbar", styles)
        self.assertIn("compact-lists", styles)
        self.assertIn("position: static", styles)

    def test_hydra_features_add_languages_voice_offline_and_mobile_installation(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "hydra-features.js").read_text(encoding="utf-8")
        styles = (static_dir / "hydra-features.css").read_text(encoding="utf-8")
        worker = (static_dir / "service-worker.js").read_text(encoding="utf-8")
        app_script = (static_dir / "app.js").read_text(encoding="utf-8")
        for language in ["pl", "ua", "ru", "en"]:
            self.assertIn(f"{language}:", script)
        for role in ["Brygadzista", "Kierownik", "Ochrona roślin", "Dział techniczny", "Kadry"]:
            self.assertIn(role, script)
        for marker in ["speechSynthesis", "beforeinstallprompt", "serviceWorker", "PENDING_KEY", "renderGuide", "startSync", "VERSION"]:
            self.assertIn(marker, script)
        self.assertIn("GreenhouseHydra?.afterRender", app_script)
        self.assertIn("safe-area-inset", styles)
        self.assertIn("prefers-reduced-motion", styles)
        self.assertIn("hydra-to-top", styles)
        self.assertIn("CACHE_NAME", worker)
        self.assertIn("ignoreSearch", worker)
        self.assertIn('"ux-v3.css"', worker)
        self.assertIn('"ux-v3.js"', worker)

    def test_pwa_manifest_and_service_worker_are_served_by_django(self):
        manifest = self.client.get(reverse("manifest"))
        self.assertEqual(manifest.status_code, 200)
        self.assertEqual(manifest["Content-Type"], "application/manifest+json")
        self.assertEqual(manifest.json()["display"], "standalone")
        worker = self.client.get(reverse("service_worker"))
        self.assertEqual(worker.status_code, 200)
        self.assertIn("application/javascript", worker["Content-Type"])
        self.assertContains(worker, "greenhouse-manager-")

    def test_frontend_v2_improves_readability_and_touch_navigation(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        styles = (static_dir / "frontend-v2.css").read_text(encoding="utf-8")
        script = (static_dir / "app.js").read_text(encoding="utf-8")
        for marker in ["--v2-green", ".login-card", ".large-list-toolbar", ".mobile-bottom-nav", ":focus-visible", "safe-area-inset-bottom"]:
            self.assertIn(marker, styles)
        self.assertIn('aria-pressed="${state.role === role}"', script)
        self.assertIn("<span>${item[1]}</span>", script)
        self.assertTrue((static_dir / "og-v2.png").exists())
        response = self.client.get(reverse("login"))
        self.assertContains(response, "/static/prototype/og-v2.png")

    def test_ux_v3_connects_role_context_bulk_work_and_mobile_actions(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "ux-v3.js").read_text(encoding="utf-8")
        styles = (static_dir / "ux-v3.css").read_text(encoding="utf-8")
        app_script = (static_dir / "app.js").read_text(encoding="utf-8")
        for marker in ["groupNavigation", "enhanceContextBar", "attendanceCommandCenter", "planExecutionPanel", "mapRiskOverview", "ticketWizard", "mobilePrimaryAction", "reviewStateCatalog"]:
            self.assertIn(marker, script)
        for marker in ["ux-attendance-command", "ux-plan-execution", "ux-risk-grid", "ux-ticket-wizard", "ux-mobile-primary", "ux-state-catalog"]:
            self.assertIn(marker, styles)
        self.assertIn("GreenhouseUXV3?.afterRender", app_script)

    def test_visual_system_v4_adds_consistent_icons_and_greenhouse_mode(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        script = (static_dir / "visual-system-v4.js").read_text(encoding="utf-8")
        styles = (static_dir / "visual-system-v4.css").read_text(encoding="utf-8")
        app_script = (static_dir / "app.js").read_text(encoding="utf-8")
        worker = (static_dir / "service-worker.js").read_text(encoding="utf-8")
        for marker in ["decorateNavigation", "decorateTopbar", "labelResponsiveRows", "enhanceMapSheet", "greenhouse-mode", "lucide-sprite.svg"]:
            self.assertIn(marker, script)
        for marker in ["visual-system-v4", "v4-greenhouse-mode", "v4-location-sheet", "v4-sheet-handle", "prefers-reduced-motion"]:
            self.assertIn(marker, styles)
        self.assertIn("GreenhouseVisualV4?.afterRender", app_script)
        self.assertIn('"visual-system-v4.css"', worker)
        self.assertIn('"visual-system-v4.js"', worker)
        self.assertTrue((static_dir / "lucide-sprite.svg").exists())

    def test_work_context_is_compact_without_repeating_date_and_shift(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "visual-system-v4.css").read_text(encoding="utf-8")
        visual_script = (static_dir / "visual-system-v4.js").read_text(encoding="utf-8")
        for marker in ["contextDateLabel", "context-summary", "context-schedule", "context-controls", "Zapisano", "Szukaj w tym widoku"]:
            self.assertIn(marker, enhancements)
        for marker in [".context-summary", ".context-schedule", ".context-controls", ".v4-context-search-icon"]:
            self.assertIn(marker, styles)
        self.assertIn("decorateContextBar", visual_script)

    def test_context_is_module_specific_filterable_and_reports_real_save_state(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        ux_script = (static_dir / "ux-v3.js").read_text(encoding="utf-8")
        visual_script = (static_dir / "visual-system-v4.js").read_text(encoding="utf-8")
        styles = (static_dir / "visual-system-v4.css").read_text(encoding="utf-8")
        for marker in ["contextProfiles", "saveFeaturePreferences", "greenhouse-context-preferences-v1", "context-current-shift", "data-context-active-row"]:
            self.assertIn(marker, enhancements)
        for marker in ["moduleContextControl", "renderContextChips", "setCurrentShift", "clear-context-all", "clear-context-module"]:
            self.assertIn(marker, ux_script)
        for marker in ["renderSaveState", "markSaving", "confirmDirtyClose", "beforeunload", "refreshContext"]:
            self.assertIn(marker, visual_script)
        for marker in [".context-active-row", ".context-chips", ".context-clear-all", ".context-saved.offline"]:
            self.assertIn(marker, styles)

    def test_shift_exceptions_and_resource_assignment_are_connected(self):
        static_dir = Path(__file__).parent / "static" / "prototype"
        enhancements = (static_dir / "enhancements.js").read_text(encoding="utf-8")
        styles = (static_dir / "visual-system-v4.css").read_text(encoding="utf-8")
        for marker in [
            "function workflowPanel()",
            "function exceptionCenterPanel()",
            "function resourceState()",
            "function enhanceTaskAssignmentForm()",
            "function updateSmartAssignmentSummary(form)",
            "input.disabled = true",
            'action === "show-resource-conflicts"',
            "v5-exception-center",
            "v5-resource-board",
            "v5-assignment-summary",
        ]:
            self.assertIn(marker, enhancements)
        for marker in [
            ".v5-exception-center",
            ".v5-plan-resources",
            ".v5-resource-board",
            ".v5-assignment-summary",
            ".v5-assignment-warning",
        ]:
            self.assertIn(marker, styles)
