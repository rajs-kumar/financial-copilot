"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  loading: false,
  error: null,
});

interface AuthProviderProps {
  children: ReactNode;
}

// const MOCK_TOKEN = process.env.NEXT_PUBLIC_MOCK_TOKEN;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTokenValid = (token: string) => {
    try {
      // In development mode, consider any well-formed token valid
      if (process.env.NODE_ENV === 'development') {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
          // Check if the token has a valid structure (parseable JSON)
          const payload = JSON.parse(atob(parts[1]));
          
          // Check for minimum required fields
          if (!payload.exp) return true; // No expiration in dev mode is fine
          
          // If it has expiration, check it
          return payload.exp * 1000 > Date.now();
        } catch {
          return false; // Not a valid JSON in the payload
        }
      }
      
      // Production validation
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');

    if (storedToken && isTokenValid(storedToken)) {
      setToken(storedToken);
    } else if (storedToken) {
      localStorage.removeItem('accessToken');
      setToken(null);
    }

    // Remove auto-login in development mode
    // else if (process.env.NODE_ENV === 'development' && MOCK_TOKEN) {
    //   setToken(MOCK_TOKEN);
    //   localStorage.setItem('accessToken', MOCK_TOKEN);
    // }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // In development mode, accept any login credentials
      if (process.env.NODE_ENV === 'development') {
        // Create a mock JWT token
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          sub: '1234567890',
          name: email || 'Test User',
          email: email || 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
        }));
        const signature = btoa('fake_signature');
        
        const mockToken = `${header}.${payload}.${signature}`;
        setToken(mockToken);
        localStorage.setItem('accessToken', mockToken);
        return true;
      }

      // In production, validate against the real API
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password }) as {
        data: { success: boolean; data: { token: string }; message?: string }
      };

      if (response.data.success && response.data.data.token) {
        const newToken = response.data.data.token;
        setToken(newToken);
        localStorage.setItem('accessToken', newToken);
        return true;
      } else {
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);

    // Optionally redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        logout,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
