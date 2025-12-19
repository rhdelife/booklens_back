import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import bookRoutes from './routes/books';
import postingRoutes from './routes/postings';
import aiRoutes from './routes/ai';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// JSON parsing
app.use(express.json());

// Simple request logging
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'BookLens Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      books: '/api/books/*',
      postings: '/api/postings/*',
      ai: {
        recommendations: '/api/ai/recommendations',
        readingTendency: '/api/ai/reading-tendency',
      },
    },
  });
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/postings', postingRoutes);
app.use('/api/ai', aiRoutes);

// 404 for /api
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

export default app;


