import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const generateTestToken = () => {
  const userId = uuidv4(); // Generate a test user ID
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '1d' }
  );
  
  console.log('Generated test token:', token);
  return token;
};

generateTestToken();