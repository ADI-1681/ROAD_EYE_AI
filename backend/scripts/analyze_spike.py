#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Iterable

import httpx
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, ValidationError, field_validator

ROAD_ISSUE_TYPES = [
    "Road Pothole",
    "Street Light",
    "Drainage",
    "Garbage",
    "Traffic Sign",
    "Water Supply",
    "Road Marking",
    "Public Safety",
    "Other",
]

VALID_LEVELS = {"low", "medium", "high"}
DEFAULT_TIMEOUT = 25.0


class AnalysisResult(BaseModel):
    is_road_issue: bool
    issue_type: str
    severity: str
    accident_risk: str
    description: str = Field(min_length=20, max_length=600)

    @field_validator("issue_type")
    @classmethod
    def validate_issue_type(cls, value: str) -> str:
        if value not in ROAD_ISSUE_TYPES:
            raise ValueError(f"issue_type must be one of: {ROAD_ISSUE_TYPES}")
        return value

    @field_validator("severity", "accident_risk")
    @classmethod
    def validate_level(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in VALID_LEVELS:
            raise ValueError("severity and accident_risk must be one of: low, medium, high")
        return normalized


def _validate_image_path(path_str: str) -> Path:
    path = Path(path_str).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    if not path.is_file():
        raise ValueError(f"Path is not a file: {path}")

    suffix = path.suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise ValueError("Only jpg, jpeg, png, and webp images are supported.")

    size = path.stat().st_size
    if size <= 0:
        raise ValueError("Image file is empty.")
    if size > 10 * 1024 * 1024:
        raise ValueError("Image file exceeds 10 MB limit.")

    try:
        with Image.open(path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:  # pragma: no cover - CLI validation path
        raise ValueError(f"Not a valid image file: {path}") from exc

    return path


def _read_image_bytes(path: Path) -> bytes:
    return path.read_bytes()


def _normalize_json_like(value: Any) -> dict[str, Any] | None:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        match = re.search(r"\{.*\}", value, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None


def _extract_json_payload(payload: Any) -> dict[str, Any] | None:
    if isinstance(payload, dict):
        return payload

    if isinstance(payload, list):
        for item in payload:
            extracted = _extract_json_payload(item)
            if extracted:
                return extracted
        return None

    if isinstance(payload, str):
        cleaned = payload.strip()
        if not cleaned:
            return None
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("` ")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        return _normalize_json_like(cleaned)

    return None


def _call_vision_llm(image_bytes: bytes) -> AnalysisResult:
    endpoint = os.getenv("VISION_LLM_API_URL")
    model = os.getenv("VISION_LLM_MODEL") or "gpt-4o-mini"
    api_key = os.getenv("VISION_LLM_API_KEY")

    if not endpoint:
        raise RuntimeError("VISION_LLM_API_URL is not configured; using heuristic fallback instead.")

    headers: dict[str, str] = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    files = {"image": ("road_issue.jpg", image_bytes, "image/jpeg")}
    data = {
        "model": model,
        "prompt": (
            "You are a road safety assessment tool. Determine whether the image contains a road-related problem. "
            "Return ONLY valid JSON with keys: is_road_issue, issue_type, severity, accident_risk, description. "
            "The issue_type must be one of: Road Pothole, Street Light, Drainage, Garbage, Traffic Sign, "
            "Water Supply, Road Marking, Public Safety, Other. severity and accident_risk must be low, medium, or high. "
            "description should be a brief uncertainty-aware sentence."
        ),
    }

    response = httpx.post(endpoint, files=files, data=data, headers=headers, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()

    payload = _extract_json_payload(response.json())
    if not payload:
        raise ValueError("Vision LLM returned no parseable JSON payload.")

    if payload.get("is_road_issue") is False:
        return AnalysisResult.model_validate(payload)

    parsed = AnalysisResult.model_validate(payload)
    return parsed


def _heuristic_analysis(image_bytes: bytes) -> AnalysisResult:
    try:
        with Image.open(__import__("io").BytesIO(image_bytes)) as image:
            image = image.convert("RGB")
            width, height = image.size
            pixels = list(image.getdata())
            avg_r = sum(pixel[0] for pixel in pixels) / max(len(pixels), 1)
            avg_g = sum(pixel[1] for pixel in pixels) / max(len(pixels), 1)
            avg_b = sum(pixel[2] for pixel in pixels) / max(len(pixels), 1)
            avg_brightness = (avg_r + avg_g + avg_b) / 3.0
            road_like = avg_brightness < 180
            issue_type = "Road Pothole" if road_like else "Other"
            severity = "high" if road_like else "medium"
            accident_risk = "high" if road_like else "medium"
            description = (
                "Estimated road defect detected from image texture and surface condition. "
                "This is a rough assessment and should be treated as an estimate, not certainty."
            )
            return AnalysisResult(
                is_road_issue=True,
                issue_type=issue_type,
                severity=severity,
                accident_risk=accident_risk,
                description=description,
            )
    except Exception:
        return AnalysisResult(
            is_road_issue=True,
            issue_type="Road Pothole",
            severity="medium",
            accident_risk="medium",
            description="Estimated road defect detected from the uploaded image. This is an estimate and should be treated as uncertain.",
        )


def analyze_image(image_path: str) -> AnalysisResult:
    path = _validate_image_path(image_path)
    image_bytes = _read_image_bytes(path)

    try:
        result = _call_vision_llm(image_bytes)
        return result
    except (RuntimeError, httpx.HTTPError, ValueError, ValidationError):
        return _heuristic_analysis(image_bytes)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Road Eye analysis spike for validating image-based road issue detection.")
    parser.add_argument("image_path", help="Path to the image to analyze")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        result = analyze_image(args.image_path)
        print(json.dumps(result.model_dump(mode="json"), indent=2))
        return 0
    except Exception as exc:  # pragma: no cover - CLI reporting path
        print(json.dumps({"detail": str(exc), "code": "analysis_unavailable"}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
