import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true, // Izinkan penerimaan cookie HTTP-Only
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'tukang-iam-service',
    timestamp: new Date().toISOString(),
  }); 
});

// API Routes
app.use('/api/v1/auth', authRoutes);

// Fallback Route (404 Not Found)
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Endpoint ${req.originalUrl} tidak ditemukan`,
  });
});

// Centralized Error Handling Middleware (Wajib ditaruh paling bawah)
app.use(errorHandler);

export default app;