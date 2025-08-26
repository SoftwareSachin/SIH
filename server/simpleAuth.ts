import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication middleware - no sessions required
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For development, allow access without authentication
    if (process.env.NODE_ENV === 'development') {
      // Set a default user for development
      (req as any).user = {
        id: 'dev-user-1',
        email: 'dev@fra-atlas.com',
        firstName: 'Developer',
        lastName: 'User',
        role: 'admin'
      };
      return next();
    }
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  
  try {
    // Simple token validation - in production, use JWT or proper tokens
    // For development, treat token as email and find user by ID for now
    let user = await storage.getUser(token);
    if (user) {
      (req as any).user = user;
      return next();
    }
  } catch (error) {
    console.error('Auth error:', error);
  }
  
  return res.status(401).json({ message: "Invalid token" });
};

export async function setupSimpleAuth(app: Express) {
  // Simple login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // For development, accept any email/password
      if (process.env.NODE_ENV === 'development') {
        // For development, create a simple user
        const user: any = { 
          id: `dev-${Date.now()}`, 
          email, 
          firstName: 'Developer', 
          lastName: 'User', 
          role: 'admin' 
        };
        
        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token: user.id // Use user ID as simple token for development
        });
      }

      // In production, implement proper password verification
      // In production, implement proper user lookup
      const user: any = null;
      if (user) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token: email
        });
      }

      res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user endpoint
  app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({ user: (req as any).user });
  });

  // Logout endpoint (simple)
  app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: "Logged out" });
  });
}