"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const dataIngestionRoutes_js_1 = __importDefault(require("./routes/dataIngestionRoutes.js"));
const transactionRoutes_js_1 = __importDefault(require("./routes/transactionRoutes.js"));
const copilotChatRoutes_js_1 = __importDefault(require("./routes/copilotChatRoutes.js"));
const database_1 = require("./config/database");
const messageQueue_1 = require("./orchestration/messageQueue");
// Load environment variables
dotenv_1.default.config();
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Create uploads directory if it doesn't exist
const fs_1 = __importDefault(require("fs"));
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Routes
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/data', dataIngestionRoutes_js_1.default);
app.use('/api/transactions', transactionRoutes_js_1.default);
app.use('/api/copilot', copilotChatRoutes_js_1.default);
// Error handling middleware
app.use(errorHandler_js_1.errorHandler);
// Start server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Connect to database
        yield (0, database_1.connectDatabase)();
        // Setup message queue
        yield (0, messageQueue_1.setupMessageQueue)();
        // Start listening
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});
// Start the server
if (require.main === module) {
    startServer();
}
exports.default = app;
