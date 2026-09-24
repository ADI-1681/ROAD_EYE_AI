# 🚧 ROAD EYE AI

### 🛣️ Smart Road Monitoring & Civic Issue Management Platform

<p align="center">
  <b>Report. Detect. Resolve. Improve.</b>
</p>

<p align="center">
  Road Eye AI is a modern civic-tech platform that connects citizens with road-management authorities to report, analyze, track, and resolve infrastructure problems.
</p>

<p align="center">

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Road%20Eye-blue?style=for-the-badge)](https://citizen-dashboard-rho.vercel.app/)

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/ADI-1681/ROAD_EYE_AI)

</p>

---

# 🌟 About The Project

Road Eye AI is a **smart civic issue reporting and road monitoring platform** built to simplify the way road-related problems are reported and managed.

Citizens can report issues such as:

- 🕳️ Potholes
- 🛣️ Damaged Roads
- 🌧️ Waterlogging
- 🚧 Other infrastructure problems

The platform allows citizens to upload images, provide issue details, track complaint status, and view resolution evidence.

Administrators get a dedicated dashboard to review complaints, manage priorities, update statuses, visualize incidents on maps, and monitor road conditions.

---

# 🎯 Problem Statement

Road infrastructure problems are often difficult to report and track efficiently.

Traditional complaint systems can result in:

- Delayed reporting
- Lack of visual evidence
- Poor complaint tracking
- Difficulty identifying high-priority areas
- Limited communication between citizens and authorities

### 💡 Our Solution

Road Eye AI creates a centralized platform where:

```text
Citizen
   ↓
Reports Road Issue
   ↓
Uploads Evidence
   ↓
AI-Assisted Analysis
   ↓
Complaint Submitted
   ↓
Admin Reviews
   ↓
Issue Resolved
   ↓
Resolution Evidence
   ↓
Citizen Gets Update

                    ┌─────────────────────┐
                    │      CITIZENS       │
                    │                     │
                    │  Report Road Issue  │
                    │  Upload Images      │
                    │  Track Complaints   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   REACT FRONTEND    │
                    │                     │
                    │  Citizen Portal     │
                    │  Admin Portal       │
                    │  Maps               │
                    │  Complaint UI       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    FASTAPI API      │
                    │                     │
                    │ Authentication      │
                    │ Complaints          │
                    │ Dashboard           │
                    │ Admin Management    │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
       ┌─────────────────┐         ┌─────────────────┐
       │   AI ANALYSIS   │         │      MAPS       │
       │                 │         │                 │
       │ Image Analysis  │         │ OpenStreetMap   │
       │ Issue Detection │         │ Leaflet         │
       │ Severity        │         │ Location Data   │
       └─────────────────┘         └─────────────────┘

📁 Project Structure
ROAD_EYE_AI/
│
├── citizen-dashboard/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── assets/
│   │   └── ...
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── ...
│
├── backend/
│   │
│   ├── app.py
│   ├── requirements.txt
│   └── ...
│
└── README.md


✨ Features
👤 Citizen Portal
🔐 Authentication
Citizen registration
Citizen login
Authentication flow
Protected dashboard routes
📊 Citizen Dashboard
Civic summary cards
Complaint statistics
Recent complaints
Complaint status overview
📝 Report Road Issue

Citizens can submit road complaints with:

Issue category
Description
Location
Priority
Road images
Additional issue information
🖼️ Image Upload
Upload multiple images
Image validation
Image size validation
Before/after evidence
📋 Complaint Tracking

Citizens can:

View submitted complaints
Open complaint details
Track complaint status
View issue information
View resolution evidence
