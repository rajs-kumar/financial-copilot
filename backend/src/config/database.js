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
exports.getClient = exports.query = exports.getPool = exports.connectDatabase = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
const pool = new pg_1.Pool(poolConfig);
const connectDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
        // Check for pgvector extension (for vector embeddings)
        const client2 = yield pool.connect();
        try {
            yield client2.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
      `);
            console.log('Vector extension enabled');
        }
        catch (err) {
            console.warn('Could not enable vector extension. Vector search will not be available:', err);
        }
        finally {
            client2.release();
        }
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
});
exports.connectDatabase = connectDatabase;
const getPool = () => pool;
exports.getPool = getPool;
const query = (text, params) => __awaiter(void 0, void 0, void 0, function* () {
    const start = Date.now();
    const res = yield pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
});
exports.query = query;
const getClient = () => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield pool.connect();
    const query = client.query;
    const release = client.release;
    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
        console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 5000);
    // Monkey patch the query method to keep track of the last query executed
    const originalQuery = client.query;
    client.query = function (queryText, values, callback) {
        client.lastQuery = [queryText, values, callback];
        return originalQuery.call(this, queryText, values, callback);
    };
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release.apply(client);
    };
    return client;
});
exports.getClient = getClient;
