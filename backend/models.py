"""Validated request and response models for the PACE/CHECK coach."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

StationName = Literal[
    "SkiErg", "Sled push", "Sled pull", "Burpee broad jumps",
    "Row", "Farmers carry", "Sandbag lunges", "Wall balls",
]


class WorkoutEntry(BaseModel):
    date: date
    activity: str = Field(min_length=1, max_length=40)
    focus_areas: list[StationName] = Field(default_factory=list, max_length=8)
    minutes: int = Field(ge=1, le=600)
    effort: int = Field(ge=1, le=10)


class RecoveryEntry(BaseModel):
    date: date
    sleep: float = Field(ge=0, le=16)
    energy: int = Field(ge=1, le=10)
    soreness: int = Field(ge=1, le=10)


class CoachRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    workouts: list[WorkoutEntry] = Field(default_factory=list, max_length=40)
    check_ins: list[RecoveryEntry] = Field(default_factory=list, max_length=14)
    event_date: date
    goal: str = Field(min_length=1, max_length=12)


class CoachReply(BaseModel):
    review: str = Field(min_length=1, max_length=2500)