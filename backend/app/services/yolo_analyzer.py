from __future__ import annotations

import logging
import threading
from typing import Any


LOGGER = logging.getLogger(__name__)
_model: Any | None = None
_model_lock = threading.Lock()


def _load_model() -> Any:
    global _model

    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model

        try:
            from huggingface_hub import hf_hub_download
            from ultralytics import YOLO

            LOGGER.info('Downloading YOLO pothole weights, ~20MB...')
            weights_path = hf_hub_download(
                repo_id='Samdutse/pothole-yolov8',
                filename='best.pt',
            )
            _model = YOLO(weights_path)
            return _model
        except Exception as exc:
            raise RuntimeError(
                'YOLO analyzer is unavailable. Install ultralytics and huggingface_hub, '
                'and ensure HuggingFace model downloads are available.'
            ) from exc


def _number(value: Any) -> float:
    return float(value.item() if hasattr(value, 'item') else value)


def _no_problem() -> dict[str, Any]:
    return {
        'code': 'no_problem_found',
        'message': 'No pothole was detected in the uploaded image.',
        'analyzer': 'yolo',
        'pothole_detected': False,
        'waterlogging_detected': False,
        'depth_estimate': None,
    }


def analyze_with_yolo(image_path: str) -> dict[str, Any]:
    model = _load_model()
    results = model.predict(source=image_path, verbose=False)

    detections: list[tuple[float, float]] = []
    for result in results:
        boxes = getattr(result, 'boxes', None)
        if boxes is None or len(boxes) == 0:
            continue

        height, width = result.orig_shape[:2]
        image_area = max(float(width * height), 1.0)
        for confidence, coordinates in zip(boxes.conf, boxes.xyxy):
            x1, y1, x2, y2 = (_number(value) for value in coordinates)
            area_ratio = max(0.0, (x2 - x1) * (y2 - y1)) / image_area
            detections.append((_number(confidence), area_ratio))

    if not detections:
        return _no_problem()

    confidence, area_ratio = max(detections, key=lambda item: item[0])
    # High: confidence >= .75 and box >= 20% of image; medium: confidence >= .50
    # and box >= 8%; all other detections are low severity.
    if confidence >= 0.75 and area_ratio >= 0.20:
        severity = 'high'
    elif confidence >= 0.50 and area_ratio >= 0.08:
        severity = 'medium'
    else:
        severity = 'low'

    return {
        'code': 'valid',
        'analyzer': 'yolo',
        'pothole_detected': True,
        'waterlogging_detected': False,
        'depth_estimate': None,
        'affected_area_ratio': round(area_ratio, 4),
        'issue_type': 'Road Pothole',
        'severity': severity,
        'accident_risk': severity,
        'confidence': round(confidence, 4),
        'description': 'A pothole was detected in the uploaded image and should be reviewed for road maintenance.',
    }