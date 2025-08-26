import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication middleware - no sessions required
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // For development, always allow access with a default user
  if (process.env.NODE_ENV === 'development') {
    const authHeader = req.headers.authorization;
    let user = {
      id: 'dev-user-admin',
      email: 'admin@fra-atlas.com',
      firstName: 'Developer',
      lastName: 'User',
      role: 'admin'
    };

    // If they have a token, try to parse user info from it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // For development, token format: "email|firstName|lastName"
        const parts = token.split('|');
        if (parts.length >= 3) {
          user = {
            id: `dev-${Date.now()}`,
            email: parts[0],
            firstName: parts[1],
            lastName: parts[2],
            role: 'admin'
          };
        }
      } catch (error) {
        // Use default user if token parsing fails
      }
    }

    (req as any).user = user;
    return next();
  }

  // Production authentication (implement proper JWT validation here)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authentication required" });
  }

  return res.status(401).json({ message: "Authentication not implemented for production" });
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
        // Extract first name from email (before @)
        const firstName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        
        const user: any = { 
          id: `dev-${Date.now()}`, 
          email, 
          firstName: firstName || 'Developer', 
          lastName: 'User', 
          role: 'admin' 
        };
        
        // Create a simple token with user info
        const token = `${email}|${user.firstName}|${user.lastName}`;
        
        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token: token
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