from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class User(BaseModel):
    id: str
    name: str
    email: str
    password_hash: str
    role: Literal['citizen', 'admin']
    created_at: datetime


class LocationModel(BaseModel):
    lat: float
    lng: float
    address: str = ''


class Draft(BaseModel):
    id: str
    user_id: str
    image_url: str = ''
    location: LocationModel
    analysis: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class StatusHistoryModel(BaseModel):
    status: Literal['pending', 'in_progress', 'resolved']
    at: datetime


class Complaint(BaseModel):
    id: str
    report_code: str
    user_id: str
    image_url: str = ''
    after_image_url: str | None = None
    location: LocationModel
    analysis: dict[str, Any] = Field(default_factory=dict)
    status: Literal['pending', 'in_progress', 'resolved']
    status_history: list[StatusHistoryModel]
    landmark: str | None = None
    citizen_description: str | None = None
    created_at: datetime
    updated_at: datetime


UserModel = User
DraftModel = Draft
ComplaintModel = Complaint
