import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Database Connection
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import hostRoutes from './routes/hostRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'https://i-reserve-clientside.vercel.app',
  ...(process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()),
].filter(Boolean).map((origin) => origin.replace(/\/+$/, ''));

// Global Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }

      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true, // Required for HTTP-only cookie authentication
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  },
})); // Parse JSON payloads and preserve webhook bytes for signature verification
app.use(cookieParser()); // Parse cookies

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'active', message: 'iReserve API is running smoothly' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});