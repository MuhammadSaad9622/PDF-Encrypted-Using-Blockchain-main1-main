import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', pdfRoutes);

// All routes now use Supabase - no MongoDB checks needed

// Start server - all data now uses Supabase
const startServer = async () => {
  try {

    // Create default admin user if it doesn't exist (using Supabase)
    try {
      const { userService } = await import('./services/userService.js');
      const adminEmail = 'admin@gmail.com';
      const adminPassword = 'admin123';

      let admin = await userService.findByEmail(adminEmail);
      if (!admin) {
        admin = await userService.create({
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          name: 'Admin'
        });
        console.log('✅ Default admin user created: admin@gmail.com / admin123');
      } else {
        let needsUpdate = false;
        const updateData = {};

        if (admin.role !== 'admin') {
          updateData.role = 'admin';
          needsUpdate = true;
        }

        if (!admin.password) {
          updateData.password = adminPassword;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await userService.update(admin.id, updateData);
          console.log('✅ Admin user updated: admin@gmail.com');
        } else {
          console.log('✅ Admin user verified: admin@gmail.com');
        }
      }
    } catch (adminError) {
      console.warn('Could not create default admin:', adminError.message);
      console.warn('Make sure Supabase is configured and the users table exists.');
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
