// src/scripts/migrateLocalToDb.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/db';

async function migrateFilesToDatabase() {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const files = fs.readdirSync(uploadDir);
  
  console.log(`Found ${files.length} files to migrate`);
  
  for (const filename of files) {
    const filePath = path.join(uploadDir, filename);
    const stats = fs.statSync(filePath);
    
    // Extract information from filename (assuming format from your uploader)
    const [prefix, timestamp, extension] = filename.split('-');
    const originalName = `file-${timestamp}.${extension}`;
    
    try {
      // Create file record
      const file = await prisma.file.create({
        data: {
          id: uuidv4(),
          userId: 'SYSTEM_MIGRATION', // You'll need to update this or provide user mapping
          filePath,
          originalName,
          fileSize: stats.size,
          mimeType: extension === 'csv' ? 'text/csv' : 'application/pdf',
          fileType: extension,
          status: 'completed',
          processedAt: new Date(),
          createdAt: stats.birthtime,
        },
      });
      
      console.log(`Migrated file: ${filename}`);
    } catch (error) {
      console.error(`Error migrating file ${filename}:`, error);
    }
  }
}

// Run migration
migrateFilesToDatabase()
  .then(() => console.log('Migration completed'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());