# Backend — AI Financial Copilot

An intelligent, proactive financial assistant backend service that enables secure data ingestion, smart transaction categorization, AI-driven conversational interface, and modular agent orchestration.

---

## 🏗️ System Architecture Overview

The backend follows a modular architecture with these components:

- **API Gateway & Service Layer**: Express.js REST API with authentication, routing, and validation.
- **Agent Orchestration Engine**: Event-driven AI agents (data ingestion, transaction categorization, monitoring, copilot chat).
- **Data Storage**: PostgreSQL for structured data + future vector storage capability.
- **External Integrations**: LLM APIs, banking APIs (future), investment platforms (future).
- **Security**: JWT authentication, request validation, secure file handling.
- **Messaging System**: RabbitMQ queue-based communication between agents.

---

## 🧩 Core Features

- **Secure File Uploads**: CSV and PDF financial statements
- **Transaction Categorization**: Rules-first, LLM fallback strategy
- **Conversational AI Copilot**: NLP-driven insights and queries
- **Agent Management**: Event-based orchestration and monitoring
- **Authentication**: JWT login and user management
- **Async Processing**: Via RabbitMQ queues (dev mode supports mocks)

---

## 📦 Backend Folder Structure

backend/ ├── src/ │ ├── agents/ # Specialized AI agents │ ├── config/ # App configuration, database setup │ ├── controllers/ # API controllers │ ├── database/ # Repositories, migrations, seeds │ ├── middleware/ # Auth, validation, file handling │ ├── orchestration/ # Agent orchestrator, messaging │ ├── routes/ # API endpoint definitions │ ├── services/ # Business logic │ ├── types/ # TypeScript type definitions │ ├── utils/ # Helper functions (parsers, logger) ├── tests/ # Unit and integration tests ├── package.json ├── tsconfig.json ├── jest.config.js ├── .env.example

yaml
Copy
Edit

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL
- RabbitMQ (for messaging)

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/rajs-kumar/financial-copilot.git
cd financial-copilot/backend

# Install backend dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration

# Build TypeScript project
npm run build

# Run database migrations (if applicable)
npm run migrate

# Start the server
npm start
Development Mode
bash
Copy
Edit
# Start in development mode (hot reload with ts-node-dev)
npm run dev
🔥 API Documentation
Authentication Routes

Method	Endpoint	Description
POST	/api/auth/register	Register a new user
POST	/api/auth/login	Login and receive a JWT token
Data Ingestion Routes

Method	Endpoint	Description
POST	/api/data-ingestion/upload	Upload financial documents (CSV, PDF)
GET	/api/data-ingestion/files	List uploaded files
Transactions Routes

Method	Endpoint	Description
GET	/api/transactions	Fetch all transactions
POST	/api/transactions/categorize	Manually categorize a transaction
PUT	/api/transactions/:id	Update transaction details
Copilot Chat Routes

Method	Endpoint	Description
POST	/api/copilot/chat	Send a query to the copilot
GET	/api/copilot/insights	Get proactive insights from the system
🧪 Running Tests
Run backend unit and integration tests using Jest:

bash
Copy
Edit
npm test
✅ More test coverage will be added as services and agents mature.

🔑 Important Environment Variables (from .env)

Variable	Purpose
PORT	Backend server port
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME	PostgreSQL connection
JWT_SECRET	Token signing key
AI_API_KEY, AI_API_URL	LLM API integration
UPLOAD_DIR	Directory for file uploads
RABBITMQ_URL	RabbitMQ server URL
VECTOR_DB_URL	Future vector database
✅ Full template available in backend/.env.example.

📚 Related Documentation

Document	Location
System Architecture	/docs/Architecture.md
Getting Started Guide	/docs/Getting-Started.md

🛡️ License
© 2025 Raj Kumar. All rights reserved.
