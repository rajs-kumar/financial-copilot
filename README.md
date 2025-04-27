# AI Financial Copilot

An intelligent, AI-first financial wellness application designed to act as a proactive copilot for individuals and financial advisors.

Built with a modular, scalable architecture — featuring agent-based services, AI integration, secure ingestion pipelines, and a modern frontend.

---

## 🚀 Project Structure

financial-copilot/ 
├── backend/ # Node.js (Express + TypeScript) backend, services, agents 
├── frontend/ # Next.js (TypeScript + TailwindCSS) frontend 
├── docs/ # Architecture diagrams, documentation 
├── README.md # (You are here)


Each service (backend, frontend) is fully independent — easy to develop, deploy, and scale separately.

---

## 🛠️ Tech Stack

| Layer               | Technology                              |
|:--------------------|:----------------------------------------|
| Frontend             | Next.js, React, TypeScript, TailwindCSS |
| Backend              | Node.js, Express, TypeScript            |
| Database             | PostgreSQL                             |
| Messaging Queue      | RabbitMQ                                |
| AI Integration       | OpenAI API, LLM service abstraction     |
| Authentication       | JWT (Role-based access control)         |
| Storage              | Local File Storage (Uploads) + VectorDB |
| Testing              | Jest, React Testing Library             |

---

## 📦 Setup Instructions

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API will run at: http://localhost:5000
Make sure PostgreSQL, RabbitMQ services are running locally.

### 2. Frontend Setup
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App will run at: http://localhost:3000
Connects automatically to backend API via NEXT_PUBLIC_API_BASE_URL.

### 3. 🔑 Environment Variables
Each service manages its own environment separately:


Service	Env File
Backend	.env
Frontend	.env.local
✅ Example files provided:

backend/.env.example

frontend/.env.local.example

### 4. 📚 Key Features
Secure File Upload (CSV, PDF ingestion)

Transaction Categorization (Rules + LLM based)

Copilot Conversational Interface

Real-time Insights & Monitoring Agents

Agent Orchestration Framework (Queue-driven)

Full JWT Authentication and Role Management

Clean Monorepo Structure for Backend + Frontend

### 5. 📂 Documentation

Document	Location
System Architecture	/docs/Architecture.md
Getting Started Guide	/docs/Getting-Started.md
Data Models (Coming Soon)	/docs/Data-Models.md
Agents Overview (Coming Soon)	/docs/Agents.md

### 🛡️ License
© 2025 Raj Kumar. All rights reserved.