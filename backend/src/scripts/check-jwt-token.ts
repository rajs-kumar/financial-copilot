// backend/scripts/check-jwt-token.ts
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const checkJwtToken = (token: string) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
    console.log(`JWT Secret (first 5 chars): ${jwtSecret.substring(0, 5)}...`);
    
    // Verify the token
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    
    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = decoded.exp || 0;
    const timeLeft = expiryTime - now;
    
    return {
      valid: true,
      decoded,
      timeLeftSeconds: timeLeft,
      timeLeftFormatted: `${Math.floor(timeLeft / 3600)}h ${Math.floor((timeLeft % 3600) / 60)}m ${timeLeft % 60}s`,
      expired: timeLeft <= 0
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get token from command line argument or environment
const token = process.argv[2] || process.env.TEST_TOKEN;

if (!token) {
  console.error('No token provided. Use: ts-node check-jwt-token.ts YOUR_TOKEN');
  process.exit(1);
}

const result = checkJwtToken(token);
console.log(JSON.stringify(result, null, 2));