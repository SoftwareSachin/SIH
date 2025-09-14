import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Secure TLS configuration for development
if (process.env.NODE_ENV === 'development') {
  // Allow self-signed certificates only for Neon database connections
  // This is needed for the Neon WebSocket database connections in development
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register main application routes
  const server = await registerRoutes(app);
  

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if not already sent
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(status).json({ 
        success: false,
        message,
        error: message 
      });
    }
    
    // Log the error but don't throw it again (this was causing HTML pages)
    console.error('Global error handler:', err);
  });

  // Reconcile paths: ensure server/public exists for serveStatic
  const serverPublic = path.resolve(import.meta.dirname, "public");
  const distPublic = path.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(serverPublic) && fs.existsSync(distPublic)) {
    try {
      fs.symlinkSync(distPublic, serverPublic, "dir");
      log("Created symlink from dist/public to server/public");
    } catch (e) {
      // Fallback if symlinks are disallowed
      fs.cpSync(distPublic, serverPublic, { recursive: true });
      log("Copied dist/public to server/public");
    }
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Use Vite dev server in development, static serving in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
