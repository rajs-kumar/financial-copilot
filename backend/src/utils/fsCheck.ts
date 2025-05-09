// backend/src/utils/fsCheck.ts
import fs from 'fs';
import path from 'path';

export const checkUploadDirectory = () => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  
  try {
    // Check if directory exists
    if (!fs.existsSync(uploadDir)) {
      console.warn(`Upload directory doesn't exist: ${uploadDir}`);
      console.log('Creating upload directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
      return {
        exists: true,
        created: true,
        writable: true,
        path: path.resolve(uploadDir)
      };
    }
    
    // Check if directory is writable
    const testFileName = `test-${Date.now()}.txt`;
    const testFilePath = path.join(uploadDir, testFileName);
    
    fs.writeFileSync(testFilePath, 'Test file');
    fs.unlinkSync(testFilePath);
    
    // List existing files
    const files = fs.readdirSync(uploadDir);
    
    return {
      exists: true,
      created: false,
      writable: true,
      path: path.resolve(uploadDir),
      files: files.map(file => ({
        name: file,
        size: fs.statSync(path.join(uploadDir, file)).size
      }))
    };
  } catch (error) {
    console.error('Error checking upload directory:', error);
    return {
      exists: fs.existsSync(uploadDir),
      created: false,
      writable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      path: path.resolve(uploadDir)
    };
  }
};