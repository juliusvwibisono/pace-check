"""Focused API tests for PACE/CHECK's optional AI coaching endpoint."""

import unittest
from datetime import date
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from agent import AgentConfigurationError
from main import app
from models import CoachRequest
from social_feed import parse_reddit_atom


class WeeklyReviewEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint_is_available_without_model_key(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_coach_limits_request_size(self) -> None:
        response = self.client.post("/api/coach/weekly-review", json={
            "question": "x" * 501,
            "event_date": date.today().isoformat(),
            "goal": "1:45",
        })
        self.assertEqual(response.status_code, 422)

    def test_coach_accepts_multiple_hyrox_station_focus_areas(self) -> None:
        request = CoachRequest.model_validate({
            "question": "Review this combination session.",
            "workouts": [{
                "date": date.today().isoformat(), "activity": "Multi-station session",
                "focus_areas": ["Sled push", "Row"], "minutes": 45, "effort": 6,
            }],
            "event_date": "2027-03-01",
            "goal": "finish",
        })
        self.assertEqual(request.workouts[0].focus_areas, ["Sled push", "Row"])

    def test_coach_returns_agent_review(self) -> None:
        with patch("main.generate_weekly_review", new_callable=AsyncMock, return_value="Your running was consistent."):
            response = self.client.post("/api/coach/weekly-review", json={
                "question": "What should I notice this week?",
                "workouts": [{
                    "date": date.today().isoformat(), "activity": "Run", "minutes": 40, "effort": 6,
                }],
                "check_ins": [],
                "event_date": "2027-03-20",
                "goal": "1:45",
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"review": "Your running was consistent."})

    def test_missing_model_key_returns_clear_service_error(self) -> None:
        with patch("main.generate_weekly_review", new_callable=AsyncMock, side_effect=AgentConfigurationError("Set a model key.")):
            response = self.client.post("/api/coach/weekly-review", json={
                "question": "What should I notice?",
                "event_date": "2027-03-01",
                "goal": "1:45",
            })
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Set a model key.")


class SocialFeedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_atom_parser_extracts_safe_reddit_posts(self) -> None:
        payload = b'''<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
        <entry><id>t3_123</id><title>First HYROX race recap</title>
        <link href="https://www.reddit.com/r/hyrox/comments/123/recap/" />
        <updated>2026-10-22T10:00:00+00:00</updated><author><name>runner</name></author>
        <content type="html">&lt;p&gt;First &amp;amp; fun&lt;/p&gt;</content></entry>
        <entry><id>bad</id><title>External link</title><link href="https://example.com/post" /></entry>
        </feed>'''
        posts = parse_reddit_atom(payload)
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["title"], "First HYROX race recap")
        self.assertEqual(posts[0]["summary"], "First & fun")
        self.assertTrue(posts[0]["url"].startswith("https://www.reddit.com/"))

    def test_reddit_feed_endpoint_returns_items(self) -> None:
        with patch("main.fetch_reddit_feed", return_value=[{
            "id": "post-1", "title": "HYROX tips", "url": "https://www.reddit.com/r/hyrox/",
            "published": "2026-10-22", "author": "runner", "summary": "Race prep.", "source": "Reddit",
        }]):
            response = self.client.get("/api/social/reddit", params={"query": "HYROX race", "limit": 5})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["title"], "HYROX tips")

    def test_reddit_feed_rejects_oversized_queries(self) -> None:
        response = self.client.get("/api/social/reddit", params={"query": "h" * 121})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()