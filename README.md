<h1 align="center">📝 SpringTask</h1>

<p align="center">
  A full-stack <strong>Todo / Task Manager</strong> application built with a <strong>React + Vite</strong> frontend and an <strong>Express.js + Spring Boot</strong> backend, powered by <strong>MongoDB Atlas</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## ✨ Features

- 🔐 **Authentication** — Register & login with session-based auth (bcrypt password hashing)
- ✅ **Task Management** — Create, read, update, and delete tasks
- 🏷️ **Priority Levels** — Set tasks as `LOW`, `MEDIUM`, or `HIGH` priority
- 📂 **Categories** — Organize tasks by `Work`, `Personal`, or `Study`
- 📅 **Due Dates** — Assign deadlines and track overdue tasks
- 🔢 **Overdue Counter** — Live badge showing overdue task count
- 🔍 **Filter & Sort** — Filter by status, priority, category and sort tasks
- 💾 **MongoDB Atlas** — Cloud-hosted database with in-memory fallback for dev
- 📱 **Responsive UI** — Works seamlessly on mobile, tablet, and desktop
- ⚡ **Vite** — Lightning-fast frontend development server

---

## 🏗️ Project Structure

```
SpringTask/
├── src/                        # React frontend (TypeScript)
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # React entry point
│   ├── index.css               # Global styles
│   └── types.ts                # Shared TypeScript types
│
├── spring-boot-app/            # Spring Boot backend (Java 17)
│   ├── pom.xml                 # Maven dependencies
│   └── src/main/java/com/example/todo/
│       ├── config/             # Spring Security configuration
│       ├── controller/         # REST API controllers
│       ├── model/              # MongoDB entity models
│       └── repository/         # Spring Data repositories
│
├── server.ts                   # Express.js server (Node.js backend)
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Node.js dependencies & scripts
├── .env.example                # Environment variable template
└── index.html                  # HTML entry point
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| Java | 17 |
| Maven | 3.x |
| MongoDB Atlas | Account + Cluster |

---

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
# URL where the app is hosted (use localhost for dev)
APP_URL="http://localhost:3000"

# MongoDB Atlas connection string
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0"
MONGODB_DB="todo_database"
```

### 3. Install Dependencies & Run (Node.js Backend)

```bash
npm install
npm run dev
```

The app will be available at **http://localhost:3000**

---

### 4. Run the Spring Boot Backend (Optional)

```bash
cd spring-boot-app
mvn spring-boot:run
```

The Spring Boot API will run at **http://localhost:8080**

---

## 🌐 Deploying to Vercel

This project is configured for deployment on **Vercel**.

1. Push your code to GitHub (already done ✅)
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set the following **Environment Variables** in the Vercel dashboard:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `MONGODB_DB` | Database name (e.g., `todo_database`) |
| `APP_URL` | Your Vercel deployment URL |

4. Click **Deploy** 🎉

---

## 🔌 API Endpoints (Express Server)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login and create session |
| `POST` | `/logout` | Logout and clear session |
| `GET` | `/tasks` | Get all tasks for the logged-in user |
| `POST` | `/tasks` | Create a new task |
| `PUT` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task |
| `GET` | `/tasks/overdue` | Get count of overdue tasks |

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 6** — build tool & dev server
- **Tailwind CSS 4** — utility-first styling
- **Lucide React** — icon library
- **Motion** — animations

### Backend (Node.js)
- **Express.js** — REST API server
- **Mongoose** — MongoDB ODM
- **bcryptjs** — password hashing
- **dotenv** — environment configuration

### Backend (Java)
- **Spring Boot 3.2**
- **Spring Security** — authentication & authorization
- **Spring Data MongoDB** — data access layer
- **Lombok** — boilerplate reduction
- **Java 17**

### Database
- **MongoDB Atlas** — cloud-hosted NoSQL database

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ by <a href="https://github.com/santhoshraj706">Santhosh Raj</a></p>
