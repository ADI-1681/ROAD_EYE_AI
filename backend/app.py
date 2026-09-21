from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title='Road Eye API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        '*',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_token(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex}'


def is_google_email(email: str) -> bool:
    if not isinstance(email, str):
        return False
    return bool(re.fullmatch(r'[^@\s]+@(?:gmail\.com|googlemail\.com)', email.strip(), flags=re.IGNORECASE))


registered_citizens: dict[str, str] = {}

admin_user = {
    'id': 'admin-100',
    'name': 'Road Eye Ops',
    'email': 'adityasrivastava20060825@gmail.com',
    'role': 'admin',
    'department': 'City Operations',
}

complaints: list[dict[str, Any]] = []


def to_admin_complaint(item: dict[str, Any]) -> dict[str, Any]:
    status = item.get('status', 'pending')
    return {
        'id': item.get('id', 'CMP-0000'),
        'title': item.get('title', 'Road issue report'),
        'image_url': item.get('photoBefore') or 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
        'after_image_url': item.get('photoAfter') or None,
        'location': {
            'lat': 12.9716,
            'lng': 77.5946,
            'address': item.get('address', 'Bengaluru'),
        },
        'analysis': {
            'issue_type': item.get('type', 'Road Pothole'),
            'severity': 'high' if item.get('priority') in {'High', 'Critical'} else 'medium',
            'accident_risk': 'high' if item.get('priority') in {'High', 'Critical'} else 'medium',
            'description': item.get('description', 'Issue reported by citizen.'),
        },
        'status': status,
        'status_history': [
            {'status': status, 'at': item.get('updatedAt', utc_now())},
        ],
        'created_at': item.get('createdAt', utc_now()),
        'updated_at': item.get('updatedAt', utc_now()),
        'reporter': {
            'id': 'citizen-unknown',
            'name': 'Citizen',
            'email': '',
        },
    }


class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=4)


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str = Field(..., min_length=4)


class ComplaintCreateRequest(BaseModel):
    title: str
    type: str
    priority: str = 'Medium'
    address: str
    description: str
    location: str = '12.9716, 77.5946'


class StatusUpdateRequest(BaseModel):
    status: str


@app.get('/api/health')
def health() -> dict[str, Any]:
    return {'status': 'ok', 'service': 'road-eye-api'}


@app.post('/api/auth/login')
def citizen_login(payload: LoginRequest) -> dict[str, Any]:
    email = payload.email.strip().lower()
    if not is_google_email(email):
        raise HTTPException(status_code=401, detail='Only Gmail addresses are allowed.')

    stored_password = registered_citizens.get(email)
    if stored_password is None or payload.password != stored_password:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    user = {
        'id': f"citizen-{uuid.uuid4().hex[:6]}",
        'name': 'Citizen',
        'email': email,
        'phone': '',
        'aadhaarLast4': '',
        'ward': 'Not provided',
    }
    return {'user': user, 'token': make_token('citizen')}


@app.post('/api/auth/register')
def citizen_register(payload: RegisterRequest) -> dict[str, Any]:
    email = payload.email.strip().lower()
    if not is_google_email(email):
        raise HTTPException(status_code=400, detail='Only Gmail addresses are allowed.')

    registered_citizens[email] = payload.password

    new_user = {
        'id': f"citizen-{uuid.uuid4().hex[:6]}",
        'name': payload.name or 'Citizen',
        'email': email,
        'phone': payload.phone,
        'aadhaarLast4': '',
        'ward': 'Not provided',
    }

    return {'user': new_user, 'token': make_token('citizen')}


@app.get('/api/dashboard/summary')
def dashboard_summary() -> dict[str, Any]:
    return {
        'totalComplaints': 0,
        'resolvedThisMonth': 0,
        'avgResolutionHours': 0,
        'responseRate': 0,
    }


@app.get('/api/complaints')
def list_complaints() -> list[dict[str, Any]]:
    return complaints


@app.get('/api/complaints/{complaint_id}')
def get_complaint(complaint_id: str) -> dict[str, Any]:
    complaint = next((item for item in complaints if item['id'] == complaint_id), None)
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    return complaint


@app.post('/api/complaints')
def create_complaint(payload: ComplaintCreateRequest) -> dict[str, Any]:
    complaint = {
        'id': f"CMP-{uuid.uuid4().hex[:6].upper()}",
        'title': payload.title,
        'type': payload.type,
        'status': 'submitted',
        'priority': payload.priority,
        'location': payload.location,
        'address': payload.address,
        'description': payload.description,
        'createdAt': utc_now(),
        'updatedAt': utc_now(),
        'assignedTo': 'Awaiting assignment',
        'resolutionNote': 'Complaint submitted and awaiting validation.',
        'photoBefore': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
        'photoAfter': '',
        'sentiment': 60,
        'insights': ['Submitted successfully'],
    }
    complaints.insert(0, complaint)
    return complaint


@app.get('/api/notifications')
def notifications() -> list[str]:
    return []


@app.post('/api/admin/auth/login')
def admin_login(payload: LoginRequest) -> dict[str, Any]:
    email = payload.email.strip().lower()
    if not is_google_email(email):
        raise HTTPException(status_code=401, detail='Only Gmail addresses are allowed.')
    if email != 'adityasrivastava20060825@gmail.com' or payload.password != 'aditya2006':
        raise HTTPException(status_code=401, detail='Invalid admin credentials')

    return {'user': {**admin_user}, 'token': make_token('admin')}


@app.get('/api/admin/stats')
def admin_stats() -> dict[str, Any]:
    return {
        'total': 0,
        'pending': 0,
        'in_progress': 0,
        'resolved': 0,
        'high_severity_open': 0,
    }


@app.get('/api/admin/complaints')
def admin_complaints() -> dict[str, Any]:
    items = [to_admin_complaint(item) for item in complaints]
    return {'items': items, 'total': len(items), 'page': 1, 'page_size': len(items)}


@app.get('/api/admin/complaints/{complaint_id}')
def admin_complaint_detail(complaint_id: str) -> dict[str, Any]:
    complaint = next((item for item in complaints if item['id'] == complaint_id), None)
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')
    return to_admin_complaint(complaint)


@app.patch('/api/admin/complaints/{complaint_id}/status')
def update_status(complaint_id: str, payload: StatusUpdateRequest) -> dict[str, Any]:
    complaint = next((item for item in complaints if item['id'] == complaint_id), None)
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')

    complaint['status'] = payload.status
    complaint['updatedAt'] = utc_now()
    return complaint


@app.post('/api/admin/complaints/{complaint_id}/after-image')
async def upload_after_image(complaint_id: str, image: UploadFile = File(...)) -> dict[str, Any]:
    complaint = next((item for item in complaints if item['id'] == complaint_id), None)
    if complaint is None:
        raise HTTPException(status_code=404, detail='Complaint not found')

    filename = image.filename or 'after-image.jpg'
    complaint['photoAfter'] = f'https://example.com/uploads/{filename}'
    complaint['updatedAt'] = utc_now()
    return {'message': 'After image uploaded successfully', 'filename': filename, 'complaintId': complaint_id}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app:app', host='0.0.0.0', port=8000, reload=True)
