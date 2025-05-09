import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const prisma = new PrismaClient();

async function cleanupTestUsers() {
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test_'
          }
        }
      });
      console.log('Cleaned up existing test users');
    } catch (error) {
      console.error('Error cleaning up test users:', error);
    }
  }

async function generateTestUser() {
  try {

    await cleanupTestUsers();

    // Generate a unique email using timestamp
    const timestamp = new Date().getTime();
    const testEmail = `test_${timestamp}@example.com`;

    // Create test user with unique email
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: await bcrypt.hash('testpassword123', 10),
        role: 'USER'
      }
    });

    console.log('Created test user:', {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role
    });

    // Generate token for the user
    const token = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'default_secret',
      { 
        algorithm: 'HS256',
        expiresIn: '24h' 
      }
    );

    console.log('\nGenerated test token:', token);
    console.log('\nAdd this token to your .env file as TEST_TOKEN');
    console.log('\nTest user credentials:');
    console.log('Email:', testEmail);
    console.log('Password: testpassword123');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

generateTestUser();