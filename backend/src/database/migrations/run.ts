import fs from 'fs';
import path from 'path';
import { query } from '../../config/database';

const runMigrations = async () => {
  try {
    console.log('Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Get list of applied migrations
    const appliedMigrations = await query('SELECT name FROM migrations');
    // const appliedMigrationNames = appliedMigrations.rows.map(row => row.name);
    const appliedMigrationNames = appliedMigrations.rows.map((row: { name: any; }) => row.name);
    
    // Read migration files
    const migrationDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order
    
    // Apply migrations that haven't been applied yet
    for (const file of migrationFiles) {
      if (!appliedMigrationNames.includes(file)) {
        console.log(`Applying migration: ${file}`);
        
        // Read migration file
        const filePath = path.join(migrationDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Start transaction
        await query('BEGIN');
        
        try {
          // Execute migration
          await query(sql);
          
          // Record migration as applied
          await query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          // Commit transaction
          await query('COMMIT');
          
          console.log(`Migration ${file} applied successfully`);
        } catch (error) {
          // Rollback on error
          await query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, error);
          throw error;
        }
      } else {
        console.log(`Migration ${file} already applied`);
      }
    }
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
};

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

export default runMigrations;