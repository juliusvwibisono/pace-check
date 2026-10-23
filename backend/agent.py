"""Read-only weekly training coach built with PydanticAI."""

import json
import os
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext, UsageLimits
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from models import CoachRequest, WorkoutEntry

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "prompt.md"
load_dotenv(PROJECT_ROOT / ".env")


class AgentConfigurationError(RuntimeError):
    """Raised when a coach request is made without a configured model key."""


@dataclass
class CoachDependencies:
    request: CoachRequest


def _model() -> OpenAIChatModel:
    portkey_key = os.getenv("PORTKEY_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    if portkey_key:
        provider = OpenAIProvider(
            base_url=os.getenv("OPENAI_BASE_URL") or "https://api.portkey.ai/v1",
            api_key=portkey_key,
        )
        return OpenAIChatModel("gpt-6-luna", provider=provider)
    if openai_key:
        provider = OpenAIProvider(
            base_url=os.getenv("OPENAI_BASE_URL") or None,
            api_key=openai_key,
        )
        return OpenAIChatModel(os.getenv("OPENAI_MODEL") or "gpt-4o-mini", provider=provider)
    raise AgentConfigurationError("Set PORTKEY_API_KEY or OPENAI_API_KEY in Homework 6/.env to use the AI coach.")


def _recent_entries(entries: list[WorkoutEntry], start: date, end: date) -> list[WorkoutEntry]:
    return [entry for entry in entries if start <= entry.date < end]


def build_agent() -> Agent[CoachDependencies, str]:
    instructions = PROMPT_PATH.read_text(encoding="utf-8")
    agent: Agent[CoachDependencies, str] = Agent(
        _model(),
        deps_type=CoachDependencies,
        output_type=str,
        instructions=instructions,
        name="pace_check_weekly_coach",
        retries=0,
    )

    @agent.tool
    def summarize_training(ctx: RunContext[CoachDependencies]) -> str:
        """Summarize session counts, minutes, station coverage, and effort for recent weeks."""
        today = date.today()
        workouts = ctx.deps.request.workouts
        last_week = _recent_entries(workouts, today - timedelta(days=7), today + timedelta(days=1))
        prior_week = _recent_entries(workouts, today - timedelta(days=14), today - timedelta(days=7))
        four_weeks = _recent_entries(workouts, today - timedelta(days=28), today + timedelta(days=1))
        station_names = {
            "SkiErg", "Sled push", "Sled pull", "Burpee broad jumps", "Row",
            "Farmers carry", "Sandbag lunges", "Wall balls",
        }

        def totals(entries: list[WorkoutEntry]) -> dict[str, object]:
            return {
                "sessions": len(entries),
                "minutes": sum(entry.minutes for entry in entries),
                "average_effort_rpe": round(sum(entry.effort for entry in entries) / len(entries), 1) if entries else None,
                "activities": sorted({entry.activity for entry in entries}),
            }

        summary = {
            "last_7_days": totals(last_week),
            "prior_7_days": totals(prior_week),
            "last_28_days": totals(four_weeks),
            "station_types_seen_last_28_days": sorted({
                station
                for entry in four_weeks
                for station in [*entry.focus_areas, *([entry.activity] if entry.activity in station_names else [])]
            }),
            "race_simulations_last_28_days": sum(entry.activity == "Race simulation" for entry in four_weeks),
            "event_date": ctx.deps.request.event_date.isoformat(),
            "athlete_goal": ctx.deps.request.goal,
        }
        return json.dumps(summary, separators=(",", ":"))

    @agent.tool
    def summarize_recovery(ctx: RunContext[CoachDependencies]) -> str:
        """Summarize recent self-reported sleep, energy, and soreness without diagnosis."""
        today = date.today()
        entries = [entry for entry in ctx.deps.request.check_ins if today - timedelta(days=14) <= entry.date <= today]
        if not entries:
            return "No recovery check-ins were logged in the last 14 days."
        result = {
            "check_ins": len(entries),
            "average_sleep_hours": round(sum(entry.sleep for entry in entries) / len(entries), 1),
            "average_energy_1_to_10": round(sum(entry.energy for entry in entries) / len(entries), 1),
            "average_soreness_1_to_10": round(sum(entry.soreness for entry in entries) / len(entries), 1),
        }
        return json.dumps(result, separators=(",", ":"))

    return agent


async def generate_weekly_review(request: CoachRequest) -> str:
    """Run one bounded agent turn using only the supplied log summaries."""
    context = CoachDependencies(request=request)
    result = await build_agent().run(
        request.question,
        deps=context,
        usage_limits=UsageLimits(request_limit=4, tool_calls_limit=2, output_tokens_limit=450),
    )
    return result.output