# AI Financial Copilot

An intelligent, proactive financial assistant that helps individual investors and financial advisors manage their finances effectively.

## System Architecture

The application follows a modular architecture with the following components:

- **API Gateway & Service Layer**: Express.js REST API with authentication, routing, and request validation
- **Agent Orchestration Engine**: Manages AI agents for data ingestion, transaction categorization, monitoring, and copilot chat
- **Data Storage**: PostgreSQL for structured data and vector storage capability for semantic search
- **External Integrations**: Connectors for banking APIs, market data feeds, and investment platforms
- **AI/ML Components**: Integration with LLM APIs for NLP capabilities and agent reasoning

## Core Features

1. **Data Ingestion Module**: Secure file uploads (CSV, PDF) with parsing and mapping to Chart of Accounts
2. **Transaction Categorization Agent**: Smart categorization using rules-based approach and LLM integration
3. **Copilot Chat Interface**: Natural language queries with context-aware insights
4. **Security & Middleware**: Request validation, authentication, and secure file handling
5. **Messaging System**: Asynchronous processing between agents

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- RabbitMQ (for messaging)

### Installation

```bash
# Clone the repository
git clone https://github.com/rajs-kumar/financial-copilot.git
cd financial-copilot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Run migrations
npm run migrate

# Start the server
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test
```

## API Documentation

### Authentication

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login and receive JWT token

### Data Ingestion

- POST `/api/data/upload` - Upload financial documents (CSV, PDF)
- GET `/api/data/files` - List uploaded files

### Transactions

- GET `/api/transactions` - Get all transactions
- POST `/api/transactions/categorize` - Manually categorize a transaction
- PUT `/api/transactions/:id` - Update transaction details

### Copilot Chat

- POST `/api/copilot/chat` - Send a query to the copilot
- GET `/api/copilot/insights` - Get proactive insights

## Testing

The application includes unit tests and integration tests using Jest. Run tests with:

```bash
npm test
```

## License

[MIT](LICENSE)