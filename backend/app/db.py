from __future__ import annotations

import os
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ReturnDocument

_client: AsyncIOMotorClient[Any] | None = None
_database: AsyncIOMotorDatabase[Any] | None = None


def get_database() -> AsyncIOMotorDatabase[Any]:
    if _database is None:
        raise RuntimeError('MongoDB is not initialized. Start the application first.')
    return _database


async def connect_to_mongo() -> None:
    global _client, _database

    if _database is not None:
        return

    uri = os.getenv('MONGODB_URI', 'mongodb://127.0.0.1:27017')
    database_name = os.getenv('MONGODB_DB_NAME', 'road_eye')
    _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    await _client.admin.command('ping')
    _database = _client[database_name]

    await _database.complaints.create_index([('location', '2dsphere')], name='complaints_location_2dsphere')
    await _database.complaints.create_index([('status', 1), ('created_at', -1)], name='complaints_status_created')
    await _database.complaints.create_index([('user_id', 1), ('created_at', -1)], name='complaints_user_created')
    await _database.drafts.create_index([('created_at', 1)], expireAfterSeconds=86400, name='drafts_ttl_24h')
    await _database.users.create_index('email', unique=True, name='users_email_unique')

    admin_email = os.getenv('ADMIN_EMAIL', 'adityasrivastava20060825@gmail.com').strip().lower()
    admin_password = os.getenv('ADMIN_PASSWORD', 'aditya2006')
    if not await _database.users.find_one({'email': admin_email}):
        import bcrypt
        from datetime import datetime, timezone
        from uuid import uuid4

        await _database.users.insert_one({
            'id': f'admin-{uuid4().hex[:8]}',
            'name': 'Road Eye Ops',
            'email': admin_email,
            'password_hash': bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode(),
            'role': 'admin',
            'created_at': datetime.now(timezone.utc),
        })


def close_mongo() -> None:
    global _client, _database
    if _client is not None:
        _client.close()
    _client = None
    _database = None
