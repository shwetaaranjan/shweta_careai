# 🏥 Digital Health Wallet

A comprehensive digital health wallet application that allows users to store, track, and share their health records and vitals securely.

![Health Wallet](https://img.shields.io/badge/Health-Wallet-00afaf?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)

## ✨ Features

### User Management
- User registration and login with JWT authentication
- Secure password hashing with bcrypt
- Role-based access control (Owner, Viewer)

### Health Reports
- Upload medical reports (PDF/Images)
- Organize by type: Blood Test, X-Ray, MRI, CT Scan, etc.
- Search and filter by date, type, or keywords
- Download uploaded reports

### Vitals Tracking
- Record vitals: Blood Pressure, Heart Rate, Blood Sugar, Temperature, etc.
- Visualize trends with interactive charts
- Filter by date range (7, 30, 90 days)
- View statistics (average, min, max)

### Access Control
- Share specific reports with doctors, family, or friends
- Read-only access for shared users
- Revoke access at any time

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router, Recharts, Axios |
| Backend | Node.js, Express.js |
| Database | SQLite |
| Auth | JWT (JSON Web Tokens), bcryptjs |
| File Upload | Multer |

## 📁 Project Structure

```
shweta_careai/
├── backend/
│   ├── config/
│   │   └── database.js       # SQLite connection & schema
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   ├── routes/
│   │   ├── auth.js           # Register, Login, Profile
│   │   ├── reports.js        # CRUD for reports
│   │   ├── vitals.js         # CRUD for vitals
│   │   └── sharing.js        # Access control
│   ├── uploads/              # Uploaded files stored here
│   ├── server.js             # Express entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Sidebar navigation
│   │   │   └── Layout.css
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Vitals.jsx
│   │   │   ├── Sharing.jsx
│   │   │   └── SharedReports.jsx
│   │   ├── services/
│   │   │   └── api.js        # Axios API layer
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shweta_careai
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server** (Terminal 1)
   ```bash
   cd backend
   npm start
   ```
   Server runs on `http://localhost:5000`

2. **Start the Frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
   App runs on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user profile |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Get all user reports |
| POST | `/api/reports` | Upload new report (multipart) |
| GET | `/api/reports/:id` | Get single report |
| GET | `/api/reports/:id/download` | Download report file |
| DELETE | `/api/reports/:id` | Delete report |
| GET | `/api/reports/shared` | Get reports shared with user |

**Query Parameters for GET /api/reports:**
- `type` - Filter by report type
- `startDate` - Filter from date
- `endDate` - Filter to date
- `search` - Search in title/notes

### Vitals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vitals` | Get all user vitals |
| POST | `/api/vitals` | Add new vital reading |
| GET | `/api/vitals/:id` | Get single vital |
| PUT | `/api/vitals/:id` | Update vital |
| DELETE | `/api/vitals/:id` | Delete vital |
| GET | `/api/vitals/types` | Get available vital types |
| GET | `/api/vitals/trends` | Get vitals trends/charts |

### Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sharing` | Share report with email |
| GET | `/api/sharing/by-me` | Reports shared by user |
| GET | `/api/sharing/with-me` | Reports shared with user |
| GET | `/api/sharing/report/:id` | Get shares for a report |
| DELETE | `/api/sharing/:id` | Revoke share access |

## 🔐 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: 7-day expiration
- **File Validation**: Only PDF and images (JPEG, PNG) allowed
- **File Size Limit**: 10MB maximum
- **Access Control**: Users can only access their own data or shared reports
- **CORS**: Configured for frontend origin

## 📊 Database Schema

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_filename TEXT,
  date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Vitals
CREATE TABLE vitals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  recorded_at DATETIME NOT NULL,
  report_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Shared Access
CREATE TABLE shared_access (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  shared_with_email TEXT NOT NULL,
  access_type TEXT DEFAULT 'read',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);
```

## 🎨 UI Features

- **Modern Glassmorphism Design** with gradient backgrounds
- **Responsive Layout** for mobile and desktop
- **Interactive Charts** using Recharts library
- **Smooth Animations** and hover effects
- **Toast Notifications** for user feedback
- **Modal Dialogs** for forms

## 📝 License

MIT License - feel free to use this project for learning and development.

---

Built with ❤️ for better health management
