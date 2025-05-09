// backend/src/routes/diagnosticRoutes.ts
import express from 'express';
import { query } from '../config/database';
import { checkUploadDirectory } from '../utils/fsCheck';

const router = express.Router();

router.get('/db-status', async (req, res) => {
  try {
    // Test connection
    const result = await query('SELECT NOW() as now');
    
    // Check tables
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Check records in important tables
    const filesCount = await query('SELECT COUNT(*) FROM files');
    const usersCount = await query('SELECT COUNT(*) FROM users');
    
    res.status(200).json({
      success: true,
      data: {
        connected: true,
        serverTime: result.rows[0].now,
        tables: tablesResult.rows.map((row: { table_name: any; }) => row.table_name),
        recordCounts: {
          files: parseInt(filesCount.rows[0].count),
          users: parseInt(usersCount.rows[0].count)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
});

router.get('/file-storage', (req, res) => {
  const storageInfo = checkUploadDirectory();
  res.status(200).json({
    success: true,
    data: storageInfo
  });
});

export default router;

// Add this route to your app.ts
// app.use('/api/diagnostics', diagnosticRoutes);