import { Pool, PoolConfig, PoolClient } from 'pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Extend PoolClient type to include our custom property
declare module 'pg' {
  interface PoolClient {
    lastQuery?: any[];
  }
}

dotenv.config();

console.log(__dirname);
console.log("DATABASE_URL:", process.env.DATABASE_URL); // Add this line
console.log('Initializing Prisma Client...');

// Initialize Prisma client as a singleton
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

console.log('Prisma Client initialized.');
// Initialize PostgreSQL Pool
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

// Connect to the database
export const connectDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection using the pool
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database via pool');
    client.release();

    // Test Prisma connection
    await prisma.$connect();
    console.log('Connected to PostgreSQL database via Prisma');

    // Check for pgvector extension (for vector embeddings)
    try {
      await query(`
        CREATE EXTENSION IF NOT EXISTS vector;
      `);
      console.log('Vector extension enabled');
    } catch (err) {
      console.warn('Could not enable vector extension. Vector search will not be available:', err);
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

// Disconnect from databases
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    await prisma.$disconnect();
    console.log('Disconnected from databases');
  } catch (error) {
    console.error('Error disconnecting from databases:', error);
    throw error;
  }
};

// Get the pool (for direct use if needed)
export const getPool = (): Pool => pool;

// Legacy query function for backward compatibility
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { 
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''), 
        duration, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Query error', { 
      text: text.slice(0, 100) + (text.length > 100 ? '...' : ''), 
      duration, 
      error 
    });
    throw error;
  }
};

// Get a client from the pool with timeout and query tracking
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${JSON.stringify(client.lastQuery)}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  const originalQuery = client.query;
  client.query = function(this: PoolClient, queryConfig: any, values?: any, callback?: any) {
    client.lastQuery = [queryConfig, values, callback];
    return (originalQuery as any).apply(this, arguments);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};

// Execute queries in a transaction
export const executeTransaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Export prisma directly for use in services
export default prisma;