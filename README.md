<h1 align="center">📝 SpringTask</h1>

<p align="center">
  A full-stack <strong>Todo / Task Manager</strong> application built with a <strong>React + Vite</strong> frontend and an <strong>Express.js</strong> backend, powered by <strong>MongoDB Atlas</strong>. Fully deployed on Vercel utilizing Serverless functions.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## ✨ Features

- 🔐 **Authentication** — Secure registration & login with session-based auth (bcrypt password hashing).
- ✅ **Task Management** — Create, read, update, and delete tasks instantly.
- 🏷️ **Priority Levels** — Mark tasks as `LOW`, `MEDIUM`, or `HIGH` priority.
- 📂 **Categories** — Organize tasks by `Work`, `Personal`, or `Study`.
- 📅 **Due Dates** — Assign deadlines and automatically track overdue tasks.
- 🔢 **Overdue Counter** — Live badge showing your pending overdue task count.
- 🔍 **Filter & Sort** — Easily filter by status, priority, category and sort tasks.
- 💾 **MongoDB Atlas** — Fully persistent cloud-hosted database.
- 📱 **Responsive UI** — Beautiful, glassmorphic UI that works seamlessly on mobile, tablet, and desktop.
- ⚡ **Vercel Serverless** — Backend runs as blazing fast Vercel Serverless Functions.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** 
- **Vite 6** — Lightning-fast build tool & dev server
- **Tailwind CSS 4** — Utility-first styling for premium design
- **Lucide React** — Elegant icon library
- **Motion (Framer Motion)** — Micro-animations and page transitions

### Backend
- **Node.js & Express.js** — RESTful API server 
- **Mongoose** — MongoDB Object Data Modeling (ODM)
- **Bcrypt.js** — Secure password hashing
- **Vercel Serverless Functions** — Cloud deployment

---

## 🚀 Getting Started Locally

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| MongoDB Atlas | Account + Cluster |

### 1. Clone the Repository

```bash
git clone https://github.com/santhoshraj706/SpringTask.git
cd SpringTask
```

### 2. Configure Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# MongoDB Atlas connection string
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0"
MONGODB_DB="todo_database"
```

### 3. Install Dependencies & Run 

```bash
npm install
npm run dev
```

Both the Express backend and the Vite development server will start. The app will be available at **http://localhost:3000** or the Vite port specified.

---

## 🌐 Deployment (Vercel)

This project is fully configured for zero-config deployment on **Vercel**. 

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and import your repository.
3. Set the following **Environment Variables** in the Vercel dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `MONGODB_DB`: Database name (e.g., `todo_database`).
4. Click **Deploy** 🎉

Vercel will automatically build the React frontend and map the Express backend to Serverless Functions using the included `vercel.json` and `api/index.js` configuration.

---

## 🔌 API Endpoints 

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login and establish session token |
| `POST` | `/logout` | Logout |
| `GET` | `/tasks` | Get all tasks for the authenticated user |
| `POST` | `/tasks` | Create a new task |
| `PUT` | `/tasks/:id` | Update an existing task |
| `DELETE` | `/tasks/:id` | Delete a task |
| `GET` | `/tasks/overdue` | Get count of overdue tasks |
| `GET` | `/api/db-status` | Check MongoDB connection status and cluster host |

---

<p align="center">Built with ❤️ by <a href="https://github.com/santhoshraj706">Santhosh Raj</a></p>
