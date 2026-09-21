# Road Eye

Road Eye is a civic issue reporting and operations platform designed for two user journeys:

- Citizen portal for submitting and tracking local infrastructure complaints
- Admin portal for triaging complaints, reviewing incidents, and monitoring city issues

## Tech stack

- React + Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios
- Leaflet + React Leaflet

The application preserves the original frontend stack and keeps the implementation mock-first while staying ready for backend integration.

## Features

### Citizen features

- Secure citizen login and registration flow
- Dashboard overview with civic summary cards
- Complaint history and status tracking
- Report issue form with issue metadata and images
- Complaint detail page with before/after evidence
- Review analysis and resolution summary
- Mock-backed API so the app works without a live backend

### Admin features

- Protected admin login flow
- Admin dashboard overview with metrics and needs-attention queue
- Complaint list with filters, search, sorting, and pagination
- Complaint detail review with status updates
- After-image upload workflow
- Map overview with complaint hotspots
- Dashcam monitoring demo panel

## Project structure

- `citizen-dashboard/` — frontend application
- `README.md` — project overview, setup, and credentials

## Local setup

1. Open the frontend app folder:
   ```bash
   cd "C:/Users/Aditya/OneDrive/Desktop/project/citizen-dashboard"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
4. Open the local URL shown in the terminal.

## Environment

The app reads configuration from `.env` in the frontend folder:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=true
```

## Access rules

- Only Gmail addresses are accepted for login and registration.
- The admin account uses the official Gmail credentials below.

### Admin login

- Email: adityasrivastava20060825@gmail.com
- Password: aditya2006

## Routes

### Citizen routes

- `/login`
- `/register`
- `/forgot-password`
- `/dashboard`
- `/my-complaints`
- `/report-issue`
- `/complaint/:id`

### Admin routes

- `/admin/login`
- `/admin/dashboard`
- `/admin/complaints`
- `/admin/complaints/:id`
- `/admin/map`
- `/admin/dashcam`

## Production build

```bash
npm run build
```

## Notes

- The app is intentionally mock-first and ready for backend integration.
- Authentication is demo-focused and stored in local storage for easy frontend simulation.
- The design follows a neutral civic dashboard aesthetic for government-facing operations.
- The project keeps the original stack and avoids framework drift across citizen and admin work.
