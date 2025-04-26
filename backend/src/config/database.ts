import { Pool, PoolConfig, PoolClient } from 'pg';
import dotenv from 'dotenv';

// Extend PoolClient type to include our custom property
declare module 'pg' {
  interface PoolClient {
    lastQuery?: any[];
  }
}

dotenv.config();

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

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();

    // Check for pgvector extension (for vector embeddings)
    const client2 = await pool.connect();
    try {
      await client2.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
      `);
      console.log('Vector extension enabled');
    } catch (err) {
      console.warn('Could not enable vector extension. Vector search will not be available:', err);
    } finally {
      client2.release();
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

export const getPool = (): Pool => pool;

export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  const originalQuery = client.query;
  (client.query as any) = function(this: PoolClient, queryText: string, values?: any[], callback?: any) {
    client.lastQuery = [queryText, values, callback];
    return (originalQuery as any).call(this, queryText, values, callback);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};