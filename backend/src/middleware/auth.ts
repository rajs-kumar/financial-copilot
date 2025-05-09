import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

// Add user property to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Middleware to authenticate JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication token is required' });
    return;
  }
  
  try {
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
    console.log(`Verifying token with secret: ${jwtSecret.substring(0, 5)}...`);

    const decoded = jwt.verify(token, jwtSecret) as any;
    console.log(`Token decoded for user ID: ${decoded.userId}`);
    
    // Check if user exists in database
    const result = await query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      console.log(`User ${decoded.userId} not found in database`);
      res.status(401).json({ success: false, message: 'Invalid user' });
      return;
    }
    
    // Set user in request object
    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role
    };
    
    console.log(`Authentication successful for user ${req.user.id}`);
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error(`JWT error: ${error.name} - ${error.message}`);
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ success: false, message: 'Token expired' });
      } else {
        res.status(403).json({ success: false, message: 'Invalid token' });
      }
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ success: false, message: 'Authentication error' });
    }
  }
};

// Middleware to check if user has required role
export const authorizeRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};