# AI Financial Copilot - Getting Started

This document provides instructions for setting up and running the AI Financial Copilot backend application.

## Prerequisites

- Node.js (v16+)
- PostgreSQL database
- RabbitMQ (optional - mock mode available for development)
- LLM API key (OpenAI or compatible)

## Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/financial-copilot.git
cd financial-copilot
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=financial_copilot

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# LLM API
AI_API_KEY=your_api_key
AI_API_URL=https://api.openai.com/v1

# RabbitMQ
RABBITMQ_URL=amqp://localhost
RABBITMQ_QUEUE_PREFIX=financial_copilot_
```

4. **Set up the database**

Create a PostgreSQL database named `financial_copilot` (or use the name you specified in your `.env` file).

```bash
createdb financial_copilot
sudo -u postgres createdb financial_copilot #if environment user and PGDB user do not match make it sudo
sudo -u postgres dropdb financial_copilot #Delete DB
createdb -U postgres financial_copilot #Create DB as postgres user
```

5. **Run database migrations**

```bash
npm run migrate
```

6. **Build the application**

```bash
npm run build
```

7. **Start the server**

```bash
npm start
```

For development with hot reloading:

```bash
npm run dev
```

## Project Structure

The application follows a modular architecture with the following components:

### Core Components

- **API Gateway & Services**: Express.js REST API with authentication, routing, and request validation
- **Agent System**: Specialized AI agents for data ingestion, transaction categorization, monitoring, and chat
- **Data Storage**: PostgreSQL for structured data with vector search capabilities
- **External Integrations**: Secure connectors for financial data sources

### Directory Structure

- `src/`: Source code
  - `agents/`: AI agent implementations
  - `config/`: Application configuration
  - `controllers/`: API route handlers
  - `database/`: Database migrations and utilities
  - `middleware/`: Express middleware
  - `models/`: Data models
  - `orchestration/`: Agent coordination system
  - `routes/`: API routes
  - `services/`: Business logic and services
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
  - `app.ts`: Main application entry point
- `tests/`: Test files
- `uploads/`: File upload storage directory

## Development Workflow

1. Make code changes
2. Run linting: `npm run lint`
3. Run tests: `npm test`
4. Start development server: `npm run dev`
5. Build for production: `npm run build`

## Key Features

### Data Ingestion

The application can ingest financial data from various sources:

- CSV file uploads
- PDF statement parsing
- (Future) Direct bank connections via Open Banking APIs

### Transaction Categorization

Transactions are automatically categorized using:

- Rule-based categorization system
- LLM-based intelligent categorization
- User feedback for continuous improvement

### Copilot Chat Interface

The chat interface allows users to:

- Ask natural language questions about their finances
- Receive personalized financial insights
- Get explanations for financial concepts and recommendations

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and receive a JWT token
- `GET /api/auth/profile` - Get the current user's profile
- `PUT /api/auth/profile` - Update the current user's profile

### Data Ingestion

- `POST /api/data/upload` - Upload financial documents (CSV, PDF)
- `GET /api/data/files` - List uploaded files
- `GET /api/data/files/:id/status` - Check processing status of a file
- `POST /api/data/files/:id/reprocess` - Reprocess a previously uploaded file
- `DELETE /api/data/files/:id` - Delete a file

### Transactions

- `GET /api/transactions` - Get all transactions with filtering options
- `GET /api/transactions/:id` - Get a specific transaction
- `POST /api/transactions` - Create a new transaction manually
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction
- `GET /api/transactions/stats` - Get transaction statistics and insights
- `POST /api/transactions/categorize` - Batch categorize transactions

### Copilot Chat

- `POST /api/copilot/chat` - Send a message to the copilot
- `GET /api/copilot/sessions` - Get all chat sessions
- `GET /api/copilot/sessions/:sessionId/messages` - Get messages for a chat session
- `DELETE /api/copilot/sessions/:sessionId` - Delete a chat session
- `GET /api/copilot/insights` - Get AI-generated financial insights

## Testing

Run the test suite with:

```bash
npm test
```

This will run all unit and integration tests.

## Deployment

For production deployment:

1. Set NODE_ENV to 'production' in your .env file
2. Ensure you have properly secured database credentials and API keys
3. Configure logging appropriately
4. Build the application with `npm run build`
5. Start the server with `npm start` or use a process manager like PM2

## Troubleshooting

Common issues:

1. **Database connection errors**: Check your PostgreSQL connection settings in the .env file
2. **Missing dependencies**: Run `npm install` to ensure all dependencies are installed
3. **File upload issues**: Ensure the uploads directory exists and has write permissions
4. **LLM API errors**: Verify your API key and check quota limits
5. **RabbitMQ connection issues**: In development mode, you can run without RabbitMQ as it will use a mock implementation

If you encounter other issues, check the application logs for more detailed error information.