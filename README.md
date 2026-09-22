# Road Eye

Road Eye is a civic issue reporting and operations platform designed for two primary user journeys:

- **Citizen Portal** — Submit and track local infrastructure complaints
- **Admin Portal** — Triage complaints, review incidents, manage resolutions, and monitor city issues

## Tech Stack

- React + Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios
- Leaflet + React Leaflet
- OpenStreetMap
- FastAPI backend integration ready
- AI/ML image analysis integration ready

The application currently follows a **mock-first architecture** while remaining structured for backend and AI integration.

---

## Features

### Citizen Features

- Citizen login and registration flow
- Dashboard overview with civic summary cards
- Complaint history and status tracking
- Report issue form
- Upload up to 5 images per complaint
- Image size validation
- Issue metadata collection
- Complaint detail page
- Before/after evidence
- Review analysis and resolution summary
- Mock-backed API for frontend development without a live backend

### AI-Powered Issue Analysis

Road Eye is designed to analyze uploaded road images and identify civic infrastructure problems.

Supported issue categories include:

- Potholes
- Broken/damaged roads
- Waterlogging

The planned/implemented analysis workflow can include:

- Image validation
- Road issue classification
- Severity analysis
- Multiple-image analysis
- Normal-road / no-problem-found handling
- Detection of potentially misleading submissions
- AI-generated/fake image detection
- Analysis result shown to the citizen before complaint submission

> AI detection modules are being integrated progressively and may require a trained model/backend service for production use.

---

## Admin Features

- Protected admin login flow
- Admin dashboard overview
- Complaint statistics and metrics
- Needs-attention complaint queue
- Complaint search and filtering
- Sorting and pagination
- Complaint detail review
- Complaint status updates
- After-image upload workflow
- Complaint location/map overview
- Complaint hotspot visualization
- Dashcam monitoring demo panel

### Dashcam Monitoring

The dashcam module demonstrates the planned future workflow for camera-based road monitoring.

The future system can use a vehicle-mounted camera to detect road issues such as potholes and damaged roads and send the detected incident information to the Road Eye platform.

> **Current Scope:** Dashcam hardware integration is a prototype/future-scope feature. The current application does not require physical dashcam hardware to operate.

---

## Project Structure

```text
Road Eye/
│
├── citizen-dashboard/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── README.md
└── ...
```

### Frontend Application

`citizen-dashboard/` contains the React + Vite application for the citizen and admin interfaces.

---

## Local Setup

### 1. Open the frontend folder

```bash
cd "C:/Users/Aditya/OneDrive/Desktop/project/citizen-dashboard"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev -- --host 0.0.0.0
```

### 4. Open the local URL

Open the URL displayed in the terminal, usually:

```text
http://localhost:5173
```

---

## Environment Configuration

Create a `.env` file inside the frontend folder:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=true
```

### Configuration

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL for the backend API |
| `VITE_USE_MOCK` | Enables/disables mock API mode |

For frontend-only development:

```env
VITE_USE_MOCK=true
```

When connecting to the backend:

```env
VITE_USE_MOCK=false
```

---

## Authentication

The current authentication system is designed for frontend demonstration and development.

- Citizen login and registration are supported
- Admin login is supported
- Authentication state is currently stored in local storage
- Access to admin routes is restricted through the frontend authentication flow

> Production deployment should use server-side authentication, password hashing, secure sessions or tokens, proper authorization, and protected API endpoints.

### Admin Login

Admin credentials should **not be committed to the Git repository**.

For local/demo usage, configure credentials through the appropriate local environment or authentication configuration.

---

## Routes

### Citizen Routes

```text
/login
/register
/forgot-password
/dashboard
/my-complaints
/report-issue
/complaint/:id
```

### Admin Routes

```text
/admin/login
/admin/dashboard
/admin/complaints
/admin/complaints/:id
/admin/map
/admin/dashcam
```

---

## Complaint Workflow

```text
Citizen
   │
   ▼
Login / Register
   │
   ▼
Report an Issue
   │
   ▼
Upload Road Images
   │
   ▼
AI Image Analysis
   │
   ├── Pothole
   ├── Broken Road
   ├── Waterlogging
   └── No Problem Found
   │
   ▼
Review Analysis
   │
   ▼
Submit Complaint
   │
   ▼
Admin Review
   │
   ▼
Status Update
   │
   ▼
Road Issue Resolution
   │
   ▼
Admin Uploads After-Image
   │
   ▼
Citizen Views Resolution
```

---

## AI Analysis Workflow

The image-analysis pipeline is designed to work as follows:

```text
Uploaded Image
      │
      ▼
Image Validation
      │
      ▼
AI / Computer Vision Model
      │
      ▼
Issue Detection
      │
      ├── Pothole
      ├── Broken Road
      ├── Waterlogging
      └── No Problem
      │
      ▼
Severity / Confidence Analysis
      │
      ▼
Result Shown to Citizen
      │
      ▼
Complaint Submission
```

The computer-vision model can be integrated with the backend through an API endpoint.

---

## Production Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## Current Development Status

- React frontend implemented
- Citizen portal implemented
- Admin portal implemented
- Complaint management workflow implemented
- Mock API architecture implemented
- Map integration implemented
- Image upload workflow implemented
- AI image-analysis integration in progress
- Backend integration in progress
- Dashcam hardware integration planned as future scope

---

## Notes

- The application is currently designed with a mock-first architecture.
- The frontend can operate without a live backend when mock mode is enabled.
- The application is structured for integration with a FastAPI backend.
- AI image analysis requires a suitable trained computer-vision model and backend inference service.
- Dashcam hardware is currently part of the future-scope/prototype demonstration.
- The design follows a neutral civic dashboard aesthetic suitable for citizen and government-facing operations.
- The project maintains the existing React-based frontend stack without unnecessary framework changes.

---

## Future Scope

Potential future improvements include:

- Real-time AI road monitoring
- Vehicle-mounted dashcam integration
- Automatic GPS-based incident location
- Real-time incident alerts
- Government department routing
- Email/SMS notifications
- Advanced AI severity estimation
- Historical complaint analytics
- City-wide road condition heatmaps
- Production-grade authentication and authorization
- Scalable cloud deployment

---

## License

This project is developed as a prototype for educational, hackathon, and demonstration purposes.
