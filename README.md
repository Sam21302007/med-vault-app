# 🏥 MedVault — Hospital & Patient Management System

A full-stack Healthcare & Hospital Management Web Application built with **React**, **Express.js**, and **Firebase Firestore**.

---

## 📁 Repository Structure

```
.
├── frontend/                     # React Single Page Application (SPA)
│   ├── public/                   # Static public assets (icons, index.html)
│   ├── src/                      # React source code (pages, components, context, styles, api)
│   └── package.json              # React UI dependencies
│
├── backend/                      # Node.js / Express REST API Server
│   ├── api/                      # Serverless route handler (Vercel adapter)
│   ├── routes/                   # REST API routes (auth, appointments, records, beds, etc.)
│   ├── server.js                 # Express server entry point & Firestore seeding logic
│   ├── firebase.js               # Firebase Admin SDK & In-Memory zero-crash fallback
│   └── package.json              # Backend server dependencies
│
├── package.json                  # Root orchestration package.json
├── vercel.json                   # Deployment routing configuration
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
Run the following at the root directory to install dependencies for root, backend, and frontend:
```bash
npm install
```

### 2. Start Both Frontend & Backend
Run a single command from the root directory to start Express (port `5001`) and React (port `8080`) concurrently:
```bash
npm start
```

* **Frontend**: [http://localhost:8080](http://localhost:8080)
* **Backend API**: [http://localhost:5001/api](http://localhost:5001/api)
* **Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 🔐 Credentials & Demo Logins

Password for all pre-seeded accounts: **`demo1234`**

| Role | Email | Name / Specialty |
|---|---|---|
| **Patient** | `patient@demo.com` | Ravi Kumar |
| **Patient** | `ananya.sharma@demo.com` | Ananya Sharma |
| **Doctor** | `doctor@demo.com` | Dr. Sarah Jenkins (Cardiology) |
| **Doctor** | `dr.rajesh@demo.com` | Dr. Rajesh Gupta (Dermatology) |
| **Admin** | `admin@demo.com` | System Admin |

---

## 🌐 Production Deployment Guide

### Recommended Strategy: Render (Backend) + Vercel (Frontend)

#### Step 1: Deploy Backend to Render.com
1. Create a **Web Service** on [Render.com](https://render.com) connected to your GitHub repository.
2. Set **Root Directory**: `backend`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add Environment Variable:
   - `FIREBASE_SERVICE_ACCOUNT` = *(Contents of your Firebase service account JSON)*

#### Step 2: Deploy Frontend to Vercel
1. Connect your repository to **Vercel**.
2. Set **Root Directory**: `frontend`
3. Set **Framework Preset**: `Create React App`
4. Add Environment Variable:
   - `REACT_APP_API_URL` = `https://<your-render-api-url>.onrender.com/api`
5. Click **Deploy**.
