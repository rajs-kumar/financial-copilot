import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export class AuthController {
  // Register a new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate input
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }
      
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        res.status(409).json({ success: false, message: 'User with this email already exists' });
        return;
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Generate user ID
      const userId = uuidv4();
      
      // Store user in database
      await query(
        `INSERT INTO users (id, email, password, first_name, last_name, role, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          email,
          hashedPassword,
          firstName || '',
          lastName || '',
          'user', // Default role
          new Date(),
          new Date()
        ]
      );
      
      // Generate JWT token
      const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET as jwt.Secret,
        { expiresIn: process.env.JWT_EXPIRY || '24h' } as jwt.SignOptions
      );
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId,
          email,
          token
        }
      });
    } catch (error: unknown) {
      console.error('Error registering user:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Registration failed: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Registration failed: Unknown error' });
      }
    }
  }
  
  // Login user
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }
      
      // Find user by email
      const userResult = await query(
        'SELECT id, email, password, first_name, last_name, role FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }
      
      const user = userResult.rows[0];
      
      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET as jwt.Secret,
        { expiresIn: process.env.JWT_EXPIRY || '24h' } as jwt.SignOptions
      );
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          token
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Login failed: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Login failed: Unknown error' });
      }
    }
  }
  
  // Get user profile
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      // Get user details
      const userResult = await query(
        'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      
      const user = userResult.rows[0];
      
      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Failed to get profile: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Failed to get profile: Unknown error' });
      }
    }
  }
  
  // Update user profile
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const { firstName, lastName, email } = req.body;
      
      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(firstName);
      }
      
      if (lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(lastName);
      }
      
      if (email !== undefined) {
        // Check if email is already used by another user
        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );
        
        if (existingUser.rows.length > 0) {
          res.status(409).json({ success: false, message: 'Email already in use' });
          return;
        }
        
        updateFields.push(`email = $${paramIndex++}`);
        values.push(email);
      }
      
      // Always update updated_at
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      
      // Add user ID to values
      values.push(userId);
      
      // Execute update
      if (updateFields.length > 0) {
        await query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }
      
      // Get updated user details
      const updatedUser = await query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
        [userId]
      );
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          userId: updatedUser.rows[0].id,
          email: updatedUser.rows[0].email,
          firstName: updatedUser.rows[0].first_name,
          lastName: updatedUser.rows[0].last_name,
          role: updatedUser.rows[0].role
        }
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Failed to update profile: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update profile: Unknown error' });
      }
    }
  }
  
  // Change password
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current password and new password are required' });
        return;
      }
      
      // Get current user details
      const userResult = await query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      
      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password);
      
      if (!passwordMatch) {
        res.status(401).json({ success: false, message: 'Current password is incorrect' });
        return;
      }
      
      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password in database
      await query(
        'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
        [hashedPassword, new Date(), userId]
      );
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Failed to change password: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Failed to change password: Unknown error' });
      }
    }
  }
}