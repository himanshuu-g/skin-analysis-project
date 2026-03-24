import os
import unittest
from io import BytesIO
from unittest.mock import patch

os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app import app as flask_app


class AppRouteTests(unittest.TestCase):
    def setUp(self):
        flask_app.config["TESTING"] = True
        self.client = flask_app.test_client()

    def _set_session(self, user_id="507f1f77bcf86cd799439011", csrf_token="test-csrf-token"):
        with self.client.session_transaction() as session:
            session["user_id"] = user_id
            session["csrf_token"] = csrf_token

    def test_protected_api_requires_authentication(self):
        response = self.client.get("/api/results")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "Authentication required.")

    def test_api_signup_validates_missing_name(self):
        with self.client.session_transaction() as session:
            session["csrf_token"] = "signup-csrf"

        response = self.client.post(
            "/api/auth/signup",
            json={
                "email": "student@example.com",
                "contact_number": "+919876543210",
                "password": "strongpass123",
                "confirm_password": "strongpass123",
            },
            headers={"X-CSRF-Token": "signup-csrf"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Name is required.")

    def test_api_analyze_rejects_invalid_image_content(self):
        self._set_session()

        response = self.client.post(
            "/api/analyze",
            data={
                "csrf_token": "test-csrf-token",
                "image": (BytesIO(b"not-a-real-image"), "fake.jpg", "image/jpeg"),
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Uploaded file is not a valid image.")

    def test_schedule_create_event_returns_created_payload(self):
        self._set_session()
        created_event = {
            "id": "event-1",
            "title": "Weekly skin check",
            "type": "scan",
            "priority": "medium",
            "datetime": "2026-03-30T09:00:00+00:00",
            "description": "Weekly follow-up scan",
            "reminder_minutes": 30,
            "completed": False,
        }

        with patch("app.create_schedule_event_for_user", return_value=created_event):
            response = self.client.post(
                "/api/schedule/events",
                json={
                    "title": "Weekly skin check",
                    "type": "scan",
                    "priority": "medium",
                    "datetime": "2026-03-30T09:00:00Z",
                    "description": "Weekly follow-up scan",
                    "reminder_minutes": 30,
                    "completed": False,
                },
                headers={"X-CSRF-Token": "test-csrf-token"},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["event"]["id"], "event-1")

    def test_schedule_update_event_returns_updated_payload(self):
        self._set_session()
        updated_event = {
            "id": "event-1",
            "title": "Weekly skin check",
            "type": "scan",
            "priority": "high",
            "datetime": "2026-03-30T09:00:00+00:00",
            "description": "Updated note",
            "reminder_minutes": 60,
            "completed": True,
        }

        with patch("app.update_schedule_event_for_user", return_value=updated_event):
            response = self.client.patch(
                "/api/schedule/events/event-1",
                json={
                    "priority": "high",
                    "description": "Updated note",
                    "reminder_minutes": 60,
                    "completed": True,
                },
                headers={"X-CSRF-Token": "test-csrf-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["event"]["completed"])

    def test_schedule_delete_event_returns_deleted_flag(self):
        self._set_session()

        with patch("app.delete_schedule_event_for_user", return_value=True):
            response = self.client.delete(
                "/api/schedule/events/event-1",
                headers={"X-CSRF-Token": "test-csrf-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["deleted"])


if __name__ == "__main__":
    unittest.main()
