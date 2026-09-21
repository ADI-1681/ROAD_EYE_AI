from __future__ import annotations

import importlib.util
import logging
import os
import re
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from pymongo import ReturnDocument

load_dotenv(Path(__file__).parent / '.env')

app = FastAPI(title='Road Eye API', version='0.2.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', '*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

LOGGER = logging.getLogger(__name__)
ANALYZER = os.getenv('ANALYZER', 'llm').strip().lower()
_yolo_module: Any | None = None
_db_module: Any | None = None


def _load_db_module() -> Any:
    global _db_module
    if _db_module is not None:
        return _db_module
    module_path = Path(__file__).parent / 'app' / 'db.py'
    spec = importlib.util.spec_from_file_location('road_eye_db', module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Unable to load database module from {module_path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _db_module = module
    return module


def get_database() -> Any:
    return _load_db_module().get_database()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: Any) -> str:
    return value.isoformat() if isinstance(value, datetime) else str(value)


def is_google_email(email: str) -> bool:
    return bool(re.fullmatch(r'[^@\s]+@(?:gmail\.com|googlemail\.com)', email.strip(), flags=re.IGNORECASE))


def jwt_secret() -> str:
    return os.getenv('JWT_SECRET', 'dev-only-change-this-secret')


def create_token(user: dict[str, Any]) -> str:
    expires = utc_now() + timedelta(minutes=int(os.getenv('JWT_EXPIRE_MINUTES', '1440')))
    return jwt.encode({'sub': user['id'], 'role': user['role'], 'exp': expires}, jwt_secret(), algorithm='HS256')


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'created_at': iso(user['created_at']),
    }


async def get_current_user(request: Request, db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    authorization = request.headers.get('Authorization', '')
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    try:
        payload = jwt.decode(authorization[7:], jwt_secret(), algorithms=['HS256'])
        user = await db.users.find_one({'id': payload.get('sub')})
    except (jwt.PyJWTError, TypeError):
        user = None
    if user is None:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    return user


async def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail={'code': 'admin_required', 'message': 'Admin access required'})
    return user


def _load_yolo_analyzer() -> Any:
    global _yolo_module
    if _yolo_module is not None:
        return _yolo_module
    module_path = Path(__file__).parent / 'app' / 'services' / 'yolo_analyzer.py'
    spec = importlib.util.spec_from_file_location('road_eye_yolo_analyzer', module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Unable to load YOLO analyzer module from {module_path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _yolo_module = module
    return module


def _analyze_with_llm(image_path: str) -> dict[str, Any]:
    from scripts.analyze_spike import analyze_image

    result = analyze_image(image_path)
    payload = result.model_dump(mode='json')
    if payload.get('is_road_issue') is False:
        return {'code': 'no_problem_found', 'message': payload.get('description', 'No road issue was found in the uploaded image.')}
    payload.pop('is_road_issue', None)
    return payload


def _analyze_image(image_path: str) -> dict[str, Any]:
    if ANALYZER == 'yolo':
        return _load_yolo_analyzer().analyze_with_yolo(image_path)
    if ANALYZER == 'hybrid':
        yolo_result = _load_yolo_analyzer().analyze_with_yolo(image_path)
        try:
            llm_result = _analyze_with_llm(image_path)
            return {**llm_result, 'analyzer': 'hybrid', 'pothole_detected': yolo_result.get('pothole_detected', False), 'waterlogging_detected': yolo_result.get('waterlogging_detected', False), 'depth_estimate': yolo_result.get('depth_estimate'), 'affected_area_ratio': yolo_result.get('affected_area_ratio')}
        except Exception:
            LOGGER.exception('Hybrid LLM analysis failed; returning YOLO result.')
            return yolo_result
    if ANALYZER == 'llm':
        return _analyze_with_llm(image_path)
    raise RuntimeError(f'Unsupported ANALYZER value: {ANALYZER}. Use llm, yolo, or hybrid.')


@app.on_event('startup')
async def startup() -> None:
    if ANALYZER not in {'llm', 'yolo', 'hybrid'}:
        raise RuntimeError(f'Unsupported ANALYZER value: {ANALYZER}. Use llm, yolo, or hybrid.')
    await _load_db_module().connect_to_mongo()
    if ANALYZER in {'yolo', 'hybrid'}:
        _load_yolo_analyzer()._load_model()


@app.on_event('shutdown')
async def shutdown() -> None:
    _load_db_module().close_mongo()


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str = ''
    password: str = Field(..., min_length=4)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=4)


class ConfirmRequest(BaseModel):
    description: str | None = None
    landmark: str | None = None


class ComplaintCreateRequest(BaseModel):
    title: str
    type: str
    priority: str = 'Medium'
    address: str
    description: str
    location: str = '12.9716, 77.5946'
    photoBefore: str = ''
    photos: list[str] = Field(default_factory=list)
    photoLocations: list[dict[str, Any]] = Field(default_factory=list)


class StatusUpdateRequest(BaseModel):
    status: str


def parse_location(value: str, address: str = '') -> dict[str, Any]:
    try:
        lat, lng = [float(part.strip()) for part in value.split(',', 1)]
    except (ValueError, AttributeError):
        lat, lng = 12.9716, 77.5946
    return {'lat': lat, 'lng': lng, 'address': address}


def serialize_complaint(item: dict[str, Any]) -> dict[str, Any]:
    result = dict(item)
    result.pop('_id', None)
    for key in ('created_at', 'updated_at'):
        if key in result:
            result[key] = iso(result[key])
    for history in result.get('status_history', []):
        if 'at' in history:
            history['at'] = iso(history['at'])
    result['createdAt'] = result.get('created_at')
    result['updatedAt'] = result.get('updated_at')
    result['photoBefore'] = result.get('image_url', '')
    result['photoAfter'] = result.get('after_image_url') or ''
    result['address'] = result.get('location', {}).get('address', '')
    return result


async def read_image_upload(image: UploadFile) -> tuple[bytes, str]:
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=422, detail='Please upload an image file.')
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=422, detail='Uploaded image is empty.')
    if len(image_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=422, detail='Image exceeds the 25 MB limit.')
    suffix = Path(image.filename or 'road-issue.jpg').suffix.lower() or '.jpg'
    return image_bytes, suffix


@app.get('/api/health')
async def health(db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    await db.command('ping')
    return {'status': 'ok', 'service': 'road-eye-api', 'database': 'mongodb'}


@app.post('/api/auth/register')
async def register(payload: RegisterRequest, db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    email = payload.email.strip().lower()
    if not is_google_email(email):
        raise HTTPException(status_code=400, detail='Only Gmail addresses are allowed.')
    user = {'id': f'citizen-{uuid4().hex[:8]}', 'name': payload.name, 'email': email, 'password_hash': bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(), 'role': 'citizen', 'created_at': utc_now()}
    try:
        await db.users.insert_one(user)
    except Exception as exc:
        if 'duplicate' in str(exc).lower():
            raise HTTPException(status_code=409, detail='Email already registered') from exc
        raise
    return {'user': public_user(user), 'token': create_token(user)}


@app.post('/api/auth/login')
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    user = await db.users.find_one({'email': payload.email.strip().lower()})
    if user is None or not bcrypt.checkpw(payload.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    return {'user': public_user(user), 'token': create_token(user)}


@app.get('/api/auth/me')
async def auth_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {'user': public_user(user)}


@app.get('/api/dashboard/summary')
async def dashboard_summary(user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    query = {} if user['role'] == 'admin' else {'user_id': user['id']}
    total = await db.complaints.count_documents(query)
    resolved = await db.complaints.count_documents({**query, 'status': 'resolved'})
    return {'totalComplaints': total, 'resolvedThisMonth': resolved, 'avgResolutionHours': 0, 'responseRate': 100 if total else 0}


@app.post('/api/complaints/analyze')
async def analyze_complaint(image: UploadFile = File(...), user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    image_bytes, suffix = await read_image_upload(image)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary_file:
        temporary_file.write(image_bytes)
        image_path = temporary_file.name
    try:
        analysis = _analyze_image(image_path)
    finally:
        Path(image_path).unlink(missing_ok=True)
    draft = {'id': f'DRF-{uuid4().hex[:10].upper()}', 'user_id': user['id'], 'image_url': '', 'location': {'lat': 12.9716, 'lng': 77.5946, 'address': ''}, 'analysis': analysis, 'created_at': utc_now()}
    await db.drafts.insert_one(draft)
    return {'draft_id': draft['id'], 'analysis': analysis}


@app.post('/api/complaints/{draft_id}/confirm')
async def confirm_complaint(draft_id: str, payload: ConfirmRequest = ConfirmRequest(), user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    draft = await db.drafts.find_one({'id': draft_id, 'user_id': user['id']})
    if draft is None:
        raise HTTPException(status_code=404, detail='Draft not found or expired')
    now = utc_now()
    counter = await db.counters.find_one_and_update({'_id': 'report_code'}, {'$inc': {'value': 1}}, upsert=True, return_document=ReturnDocument.AFTER)
    sequence = counter.get('value', 1)
    complaint = {'id': f'CMP-{uuid4().hex[:6].upper()}', 'report_code': f'ROADEYE-{now.year}-{sequence:05d}', 'user_id': user['id'], 'image_url': draft.get('image_url', ''), 'after_image_url': None, 'location': draft.get('location', {'lat': 12.9716, 'lng': 77.5946, 'address': ''}), 'analysis': draft.get('analysis', {}), 'status': 'pending', 'status_history': [{'status': 'pending', 'at': now}], 'landmark': payload.landmark, 'citizen_description': payload.description, 'created_at': now, 'updated_at': now}
    await db.complaints.insert_one(complaint)
    await db.drafts.delete_one({'_id': draft['_id']})
    return serialize_complaint(complaint)


@app.post('/api/complaints/{draft_id}/cancel')
async def cancel_complaint(draft_id: str, user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, bool]:
    result = await db.drafts.delete_one({'id': draft_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Draft not found or expired')
    return {'ok': True}


@app.get('/api/complaints/mine')
async def my_complaints(user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> list[dict[str, Any]]:
    return [serialize_complaint(item) async for item in db.complaints.find({'user_id': user['id']}).sort('created_at', -1)]


@app.get('/api/complaints/{complaint_id}')
async def get_complaint(complaint_id: str, user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    query = {'id': complaint_id} if user['role'] == 'admin' else {'id': complaint_id, 'user_id': user['id']}
    complaint = await db.complaints.find_one(query)
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    return serialize_complaint(complaint)


@app.get('/api/complaints')
async def list_complaints(user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> list[dict[str, Any]]:
    query = {} if user['role'] == 'admin' else {'user_id': user['id']}
    return [serialize_complaint(item) async for item in db.complaints.find(query).sort('created_at', -1)]


@app.delete('/api/complaints/{complaint_id}')
async def delete_complaint(complaint_id: str, user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, str]:
    query = {'id': complaint_id} if user['role'] == 'admin' else {'id': complaint_id, 'user_id': user['id']}
    result = await db.complaints.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Complaint not found')
    return {'message': 'Complaint deleted successfully'}


@app.post('/api/complaints')
async def legacy_create_complaint(payload: ComplaintCreateRequest, user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    now = utc_now()
    counter = await db.counters.find_one_and_update({'_id': 'report_code'}, {'$inc': {'value': 1}}, upsert=True, return_document=ReturnDocument.AFTER)
    sequence = counter.get('value', 1)
    complaint = {'id': f'CMP-{uuid4().hex[:6].upper()}', 'report_code': f'ROADEYE-{now.year}-{sequence:05d}', 'user_id': user['id'], 'image_url': payload.photoBefore, 'after_image_url': None, 'location': parse_location(payload.location, payload.address), 'analysis': {'issue_type': payload.type, 'severity': 'medium', 'accident_risk': 'medium', 'description': payload.description}, 'status': 'pending', 'status_history': [{'status': 'pending', 'at': now}], 'landmark': payload.photoLocations[0].get('address') if payload.photoLocations else None, 'citizen_description': payload.description, 'created_at': now, 'updated_at': now}
    await db.complaints.insert_one(complaint)
    return serialize_complaint(complaint)


def to_admin_complaint(item: dict[str, Any], reporter: dict[str, Any] | None = None) -> dict[str, Any]:
    complaint = serialize_complaint(item)
    location = complaint.get('location', {})
    return {'id': complaint['id'], 'report_code': complaint.get('report_code', complaint['id']), 'title': complaint.get('analysis', {}).get('issue_type', 'Road issue report'), 'image_url': complaint.get('image_url', ''), 'after_image_url': complaint.get('after_image_url'), 'location': location, 'photo_locations': complaint.get('photoLocations', []), 'analysis': complaint.get('analysis', {}), 'status': complaint.get('status', 'pending'), 'status_history': complaint.get('status_history', []), 'landmark': complaint.get('landmark'), 'citizen_description': complaint.get('citizen_description'), 'created_at': complaint.get('created_at'), 'updated_at': complaint.get('updated_at'), 'reporter': reporter or {'id': complaint.get('user_id', ''), 'name': 'Citizen', 'email': ''}}


@app.post('/api/admin/auth/login')
async def admin_login(payload: LoginRequest, db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    user = await db.users.find_one({'email': payload.email.strip().lower(), 'role': 'admin'})
    if user is None or not bcrypt.checkpw(payload.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail='Invalid admin credentials')
    return {'user': public_user(user), 'token': create_token(user)}


@app.get('/api/admin/stats')
async def admin_stats(user: dict[str, Any] = Depends(require_admin), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, int]:
    return {
        'total': await db.complaints.count_documents({}),
        'pending': await db.complaints.count_documents({'status': 'pending'}),
        'in_progress': await db.complaints.count_documents({'status': 'in_progress'}),
        'resolved': await db.complaints.count_documents({'status': 'resolved'}),
        'high_severity_open': await db.complaints.count_documents({'analysis.severity': 'high', 'status': {'$ne': 'resolved'}}),
    }


@app.get('/api/admin/complaints')
async def admin_complaints(
    status: str | None = None,
    severity: str | None = None,
    issue_type: str | None = None,
    search: str | None = None,
    sort: str = 'newest',
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    user: dict[str, Any] = Depends(require_admin),
    db: AsyncIOMotorDatabase[Any] = Depends(get_database),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if status:
        query['status'] = status
    if severity:
        query['analysis.severity'] = severity
    if issue_type:
        query['analysis.issue_type'] = issue_type
    if search:
        query['$or'] = [
            {'report_code': {'$regex': search, '$options': 'i'}},
            {'citizen_description': {'$regex': search, '$options': 'i'}},
        ]
    sort_field = 'created_at' if sort != 'severity' else 'analysis.severity'
    sort_direction = -1 if sort != 'oldest' else 1
    total = await db.complaints.count_documents(query)
    cursor = db.complaints.find(query).sort(sort_field, sort_direction).skip((page - 1) * page_size).limit(page_size)
    items = []
    async for item in cursor:
        reporter = await db.users.find_one({'id': item.get('user_id')}, {'_id': 0, 'id': 1, 'name': 1, 'email': 1})
        items.append(to_admin_complaint(item, reporter or {'id': item.get('user_id', ''), 'name': 'Citizen', 'email': ''}))
    return {'items': items, 'total': total, 'page': page, 'page_size': page_size}


@app.get('/api/admin/complaints/{complaint_id}')
async def admin_complaint_detail(complaint_id: str, user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail={'code': 'admin_required', 'message': 'Admin access required'})
    complaint = await db.complaints.find_one({'id': complaint_id})
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    reporter = await db.users.find_one({'id': complaint.get('user_id')}, {'_id': 0, 'id': 1, 'name': 1, 'email': 1})
    return to_admin_complaint(complaint, reporter)


@app.patch('/api/admin/complaints/{complaint_id}/status')
async def update_status(complaint_id: str, payload: StatusUpdateRequest, user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, Any]:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail={'code': 'admin_required', 'message': 'Admin access required'})
    complaint = await db.complaints.find_one({'id': complaint_id})
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    current_status = complaint.get('status', 'pending')
    allowed_next = {'pending': 'in_progress', 'in_progress': 'resolved'}
    if payload.status != allowed_next.get(current_status):
        raise HTTPException(status_code=409, detail={'code': 'invalid_status_transition', 'message': f'Cannot change status from {current_status} to {payload.status}.'})
    if payload.status == 'resolved' and not complaint.get('after_image_url'):
        raise HTTPException(status_code=409, detail={'code': 'after_image_required', 'message': 'An after-image is required before resolving a complaint.'})
    now = utc_now()
    await db.complaints.update_one({'id': complaint_id, 'status': current_status}, {'$set': {'status': payload.status, 'updated_at': now}, '$push': {'status_history': {'status': payload.status, 'at': now}}})
    complaint = await db.complaints.find_one({'id': complaint_id})
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    return serialize_complaint(complaint)


@app.post('/api/admin/complaints/{complaint_id}/after-image')
async def upload_after_image(complaint_id: str, image: UploadFile = File(...), user: dict[str, Any] = Depends(get_current_user), db: AsyncIOMotorDatabase[Any] = Depends(get_database)) -> dict[str, str]:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail={'code': 'admin_required', 'message': 'Admin access required'})
    complaint = await db.complaints.find_one({'id': complaint_id})
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    if complaint.get('status') not in {'in_progress', 'resolved'}:
        raise HTTPException(status_code=409, detail={'code': 'invalid_status_for_after_image', 'message': 'After-image upload is allowed only for in-progress or resolved complaints.'})
    image_bytes, suffix = await read_image_upload(image)
    import base64
    image_url = f'data:{image.content_type};base64,{base64.b64encode(image_bytes).decode()}'
    await db.complaints.update_one({'id': complaint_id}, {'$set': {'after_image_url': image_url, 'updated_at': utc_now()}})
    return {'message': 'After image uploaded successfully', 'filename': image.filename or f'after-image{suffix}', 'complaintId': complaint_id}
