import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

// Global Middlewares
app.use(cors({
  origin: true, // Nanti disesuaikan dengan domain frontend/gateway
  credentials: true // Mengizinkan pengiriman cookie HTTP-Only
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck Route sederhana
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'tukang-iam-service',
    timestamp: new Date().toISOString()
  });
});

export default app;