// backend/scripts/check-uploads-directory.ts
import { checkUploadDirectory } from '../utils/fsCheck';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const result = checkUploadDirectory();
console.log(JSON.stringify(result, null, 2));