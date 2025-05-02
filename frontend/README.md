# Frontend — AI Financial Copilot

The frontend of the AI Financial Copilot project, built using Next.js 14 (App Router), TypeScript, and TailwindCSS.

It provides a modern, secure, and responsive interface for users to interact with the backend services, upload documents, categorize transactions, and engage with the copilot conversational AI.

---

## 🛠️ Tech Stack

- Next.js 14 (React 18 under the hood)
- TypeScript
- TailwindCSS (utility-first CSS framework)
- Axios (for API communication)
- React Toastify (for notifications)
- Modern App Router structure (using layouts, segments)

---

## 📦 Folder Structure

frontend/ ├── src/ 
          │ ├── app/ # Route segments, pages, and layouts (Next.js App Router) 
          │ │ ├── ingestion/ 
          │ │ │ ├── layout.tsx # Layout wrapper for ingestion section 
          │ │ │ ├── page.tsx # Ingestion landing page 
          │ │ │ └── upload/ 
          │ │ │ └── page.tsx # Upload page for financial documents 
          │ ├── components/ # Reusable UI components (e.g., FileUploader) 
          │ ├── lib/ # API clients, utility libraries 
          │ ├── styles/ # Global CSS (Tailwind setup) 
          │ ├── public/ # Public assets (images, favicon) 
          ├── tests/ # Unit and integration tests 
          ├── package.json # Frontend dependencies and scripts 
          ├── tsconfig.json # TypeScript configuration 
          ├── jest.config.js # Testing configuration ├
          ── .env.local.example # Frontend environment template

---

## 🚀 Getting Started

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.local.example .env.local
```

Edit .env.local to set your backend API base URL.

Example:
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api

### 3. Run Frontend Development Server
```bash
npm run dev
```

App will be available at: http://localhost:3000

### 4. 🔥 Current Features Implemented
* Secure File Upload UI: CSV and PDF files with validation
* Axios-based API Integration: Secure connection to backend services
* Toast Notifications: Success/error alerts with React Toastify
* Modern UI: TailwindCSS styling, mobile responsiveness
* Authentication-ready API client: Prepared to handle JWT tokens

### 5. 🧪 Running Frontend Tests
```bash
npm run test
```
* Uses Jest and React Testing Library.
* Components and pages are tested.
* (Test coverage will grow as features expand.)

### 5. 🧩 Planned Frontend Modules (Roadmap)
* Transaction Categorization Screen
* File Upload History and Processing Status
* Insight Dashboard (proactive financial insights)
* Copilot Conversational Chat UI
* User Settings and Profile Management
* Authentication Pages (Login/Register UI)

### 6. 📚 Related Documentation

Document	Location
System Architecture	/docs/Architecture.md
Getting Started Guide	/docs/Getting-Started.md

### 7. 📢 Notes

* App Router: Using Next.js 14 App Router (/app/ folder structure) — scalable and future-proof.
* Optimized for Expansion: Components, pages, and services are separated for easy scaling.
* API Base URL Dynamic: Controlled by environment variable NEXT_PUBLIC_API_BASE_URL.

### 8. 🛡️ License
© 2025 Raj Kumar. All rights reserved.