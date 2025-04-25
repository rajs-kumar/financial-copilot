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
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
const database_1 = require("../../src/config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('Data Ingestion API', () => {
    let authToken;
    let testUserId;
    // Setup test user before tests
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Create test user in database
        testUserId = 'test-user-id';
        yield (0, database_1.query)(`INSERT INTO users (id, email, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`, [testUserId, 'test@example.com', 'password-hash', 'user', new Date(), new Date()]);
        // Generate JWT token for test user
        authToken = jsonwebtoken_1.default.sign({ userId: testUserId }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1h' });
        // Create uploads directory if it doesn't exist
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
    }));
    // Clean up after tests
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Delete test user and related data
        yield (0, database_1.query)('DELETE FROM users WHERE id = $1', [testUserId]);
    }));
    describe('GET /api/data/files', () => {
        it('should return 401 if not authenticated', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default).get('/api/data/files');
            expect(response.status).toBe(401);
        }));
        it('should return empty array when no files exist', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .get('/api/data/files')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(0);
        }));
    });
    describe('POST /api/data/upload', () => {
        it('should return 401 if not authenticated', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default).post('/api/data/upload');
            expect(response.status).toBe(401);
        }));
        it('should return 400 if no file is uploaded', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .post('/api/data/upload')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        }));
        it('should upload a CSV file successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a test CSV file
            const testCsvPath = path_1.default.join(process.env.UPLOAD_DIR || './uploads', 'test.csv');
            fs_1.default.writeFileSync(testCsvPath, 'date,description,amount,type\n2023-01-01,Test Transaction,100,debit');
            const response = yield (0, supertest_1.default)(app_1.default)
                .post('/api/data/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', testCsvPath);
            // Clean up test file
            fs_1.default.unlinkSync(testCsvPath);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('fileId');
            expect(response.body.data).toHaveProperty('status', 'processing');
        }));
    });
});
