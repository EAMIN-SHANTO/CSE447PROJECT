# TradeShield Marketplace - CSE447 Lab Project

TradeShield is a secure, strictly peer-to-peer campus marketplace designed to meet the rigorous cryptographic and security requirements of the CSE447 Lab Project. All encryption algorithms (ECC, RSA, and HMAC-SHA256) are mathematically implemented from scratch without relying on external cryptography libraries or built-in modules.

## Environment Requirements

To run this project locally, you will need the following installed on your machine:
- **Node.js:** v18.x or higher (v24.x recommended)
- **NPM:** v9.x or higher
- **MongoDB:** A local MongoDB instance or a remote MongoDB Atlas connection string.

---

## Setup Instructions

### 1. Clone the Repository
Clone the repository and navigate into the project directory:
```bash
git clone https://github.com/EAMIN-SHANTO/CSE447PROJEC
cd CSE447
```

### 2. Install Backend Dependencies
Navigate to the `backend` folder and install the required Node modules:
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
Open a new terminal, navigate to the `client` folder, and install the required Node modules:
```bash
cd client
npm install
```

---

## Environment Configuration

You must create a `.env` file in **both** the `backend` and `client` directories before running the application.

### Backend `.env`
Create a file named `.env` inside the `backend` folder and populate it with the following template. Replace the values with your actual database and email credentials:

```env
# Server Configuration
PORT=3000

# Database Configuration
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=CSE447

# Security & Session Secrets
ACCESS_TOKEN_SECRET=your-secure-access-token-secret
REFRESH_TOKEN_SECRET=your-secure-refresh-token-secret
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=604800
TWO_FACTOR_OTP_TTL_SECONDS=300

# Email/SMTP Configuration (Used for Email OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM="CSE447 Marketplace <your-email@gmail.com>"
OTP_EXPOSE_DEV_OTP=false
```

### Frontend `.env`
Create a file named `.env` inside the `client` folder. During local development, this should point to your local backend server.

```env
# Point this to your local backend server during development
VITE_API_URL=http://localhost:3000

# If deploying to production, use your deployed backend URL:
# VITE_API_URL=https://your-production-backend.onrender.com
```

---

## How to Run the Project Locally

To run the application, you need to start both the backend server and the frontend React development server concurrently.

### 1. Start the Backend Server
In your terminal, ensure you are in the `backend` directory and run:
```bash
cd backend
node index.js
```
*(You should see a message indicating the server is running on port 3000 and the database is connected).*

### 2. Start the Frontend Development Server
In a separate terminal window, ensure you are in the `client` directory and run:
```bash
cd client
npm run dev
```
*(This will start the Vite development server, typically on `http://localhost:5173`)*.

### 3. Access the Application
Open your web browser and navigate to the local URL provided by Vite (e.g., `http://localhost:5173`).

---

## Cryptography Note
If this is your first time starting the server, a `.backup-master.keys.json` file will be automatically generated in the `backend` directory. This is your local RSA Master Key used to wrap the database keys. **Do not delete this file**, or you will permanently lose access to locally encrypted database records.

---

## Admin and Staff Roles
The platform includes a robust Role-Based Access Control (RBAC) system with a secure moderation dashboard.
- **Staff:** Can view and moderate open disputes, user reports, and all posts. Staff can ban/unban regular users and delete any post.
- **Admin:** Has all Staff privileges, plus the ability to promote/demote users to Staff, and exclusive access to the System Audit Logs tracking all moderation actions.
