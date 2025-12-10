import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:');
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'Set' : 'Not set');
console.log('POLYGON_MAINNET_RPC_URL:', process.env.POLYGON_MAINNET_RPC_URL || 'Using default');
console.log('BUNDLR_NODE:', process.env.BUNDLR_NODE || 'Using default');
console.log('BUNDLR_CURRENCY:', process.env.BUNDLR_CURRENCY || 'Using default');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

// Import routes
import pdfRoutes from './routes/pdfRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5001',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://doc-and-key-early-access.onrender.com',
  'https://www.docandkey.com',
  'https://docandkey.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: ' + origin));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: tempDir,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
}));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Routes - Register before MongoDB check to avoid 404s
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', pdfRoutes);

// Middleware to check MongoDB connection (only for routes that need it)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/signup') || req.path.startsWith('/api/auth/signin')) {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database not connected. Please try again in a moment.'
    });
  }
  next();
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

// Connect to MongoDB before starting server
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    });
    console.log('Connected to MongoDB');

    // Create default admin user if it doesn't exist
    try {
      const User = (await import('./models/User.js')).default;
      const adminEmail = 'admin@gmail.com';
      const adminPassword = 'admin123';

      let admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        admin = new User({
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          name: 'Admin'
        });
        await admin.save();
        console.log('✅ Default admin user created: admin@gmail.com / admin123');
      } else {
        let needsSave = false;

        if (admin.role !== 'admin') {
          admin.role = 'admin';
          needsSave = true;
        }

        if (!admin.password) {
          admin.password = adminPassword;
          admin.markModified('password');
          needsSave = true;
        }

        if (needsSave) {
          await admin.save();
          console.log('✅ Admin user updated: admin@gmail.com');
        } else {
          console.log('✅ Admin user verified: admin@gmail.com');
        }
      }
    } catch (adminError) {
      console.warn('Could not create default admin:', adminError.message);
    }

    // Drop old username index
    try {
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      const indexes = await usersCollection.indexes();

      for (const index of indexes) {
        if (index.key && index.key.username) {
          const indexName =
            index.name || Object.keys(index.key).map(k => `${k}_${index.key[k]}`).join('_');

          try {
            await usersCollection.dropIndex(indexName);
            console.log(`Dropped old username index: ${indexName}`);
          } catch (dropError) {
            console.log(`Could not drop index ${indexName}:`, dropError.message);
          }
        }
      }
    } catch (indexError) {
      console.log('No username index to drop (or already dropped)');
    }

    // Serve static frontend in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(join(__dirname, '../dist')));
      app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../dist/index.html'));
      });
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
