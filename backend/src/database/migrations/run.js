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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../../config/database");
const runMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starting database migrations...');
        // Create migrations table if it doesn't exist
        yield (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        // Get list of applied migrations
        const appliedMigrations = yield (0, database_1.query)('SELECT name FROM migrations');
        // const appliedMigrationNames = appliedMigrations.rows.map(row => row.name);
        const appliedMigrationNames = appliedMigrations.rows.map((row) => row.name);
        // Read migration files
        const migrationDir = path_1.default.join(__dirname);
        const migrationFiles = fs_1.default.readdirSync(migrationDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort to ensure order
        // Apply migrations that haven't been applied yet
        for (const file of migrationFiles) {
            if (!appliedMigrationNames.includes(file)) {
                console.log(`Applying migration: ${file}`);
                // Read migration file
                const filePath = path_1.default.join(migrationDir, file);
                const sql = fs_1.default.readFileSync(filePath, 'utf8');
                // Start transaction
                yield (0, database_1.query)('BEGIN');
                try {
                    // Execute migration
                    yield (0, database_1.query)(sql);
                    // Record migration as applied
                    yield (0, database_1.query)('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    // Commit transaction
                    yield (0, database_1.query)('COMMIT');
                    console.log(`Migration ${file} applied successfully`);
                }
                catch (error) {
                    // Rollback on error
                    yield (0, database_1.query)('ROLLBACK');
                    console.error(`Error applying migration ${file}:`, error);
                    throw error;
                }
            }
            else {
                console.log(`Migration ${file} already applied`);
            }
        }
        console.log('Migrations completed successfully');
    }
    catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    }
});
// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
        console.log('Migration process completed');
        process.exit(0);
    })
        .catch(error => {
        console.error('Migration process failed:', error);
        process.exit(1);
    });
}
exports.default = runMigrations;
