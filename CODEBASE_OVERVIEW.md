# PDF-Encrypted-Using-Blockchain - Codebase Overview

## 🎯 Project Summary

A **decentralized PDF encryption and NFT minting platform** that allows users to:
1. Upload PDF files
2. Encrypt them using AES-256-CBC encryption
3. Store encrypted files on Arweave (decentralized storage)
4. Mint ERC-721 NFTs on Polygon blockchain with metadata containing encryption keys
5. View and decrypt PDFs (only for NFT owners)

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- React Router (routing)
- Tailwind CSS (styling)
- Ethers.js v6 (blockchain interactions)
- Axios (API calls)
- Lucide React (icons)

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose (user data & admin)
- JWT authentication
- Express-fileupload (file handling)
- Crypto (AES-256-CBC encryption)

**Blockchain:**
- Polygon Network (mainnet/testnet)
- Solidity Smart Contracts (ERC-721)
- Ethers.js (blockchain interactions)
- Arweave (decentralized file storage via Bundlr)

---

## 📁 Project Structure

```
PDF-Encrypted-Using-Blockchain/
├── backend/                    # Express.js backend server
│   ├── controllers/           # Request handlers
│   │   ├── adminController.js # Admin operations (users, stats, billing)
│   │   ├── authController.js  # Authentication (signup, signin)
│   │   ├── pdfController.js   # PDF operations (encrypt, upload, mint, decrypt)
│   │   └── statsController.js # Statistics endpoints
│   ├── middleware/            # Express middleware
│   │   ├── auth.js           # JWT authentication middleware
│   │   └── adminAuth.js      # Admin role verification
│   ├── models/               # MongoDB models
│   │   └── User.js           # User schema (email, password, role)
│   ├── routes/               # API routes
│   │   ├── adminRoutes.js    # /api/admin/*
│   │   ├── authRoutes.js     # /api/auth/*
│   │   ├── pdfRoutes.js      # /api/* (PDF operations)
│   │   └── statsRoutes.js    # /api/stats/*
│   ├── scripts/              # Utility scripts
│   │   ├── createAdmin.js    # Admin creation script
│   │   └── createDefaultAdmin.js
│   ├── temp/                 # Temporary file storage
│   ├── utils/                # Utility functions
│   │   ├── arweave.js        # Arweave/Bundlr integration
│   │   ├── encryption.js     # AES-256-CBC encryption/decryption
│   │   ├── generateMetadata.js # NFT metadata generation
│   │   └── wallet.js         # Blockchain wallet & contract interactions
│   ├── server.js             # Main server entry point
│   ├── contractAddress.json  # Deployed contract address
│   └── PdfNFT.json          # Contract ABI
│
├── contracts/                # Smart contracts
│   └── PdfNFT.sol           # ERC-721 NFT contract (with encryption key storage)
│
├── src/                      # React frontend
│   ├── components/          # React components
│   │   ├── admin/          # Admin dashboard components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── AdminProtectedRoute.tsx
│   │   │   ├── BillingInvoices.tsx
│   │   │   ├── UserDetails.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── auth/           # Authentication components
│   │   │   ├── SignIn.tsx
│   │   │   ├── SignUp.tsx
│   │   │   └── Web3AnimatedBackground.tsx
│   │   ├── Dashboard.tsx   # Main dashboard layout
│   │   ├── DashboardHome.tsx
│   │   ├── UploadPDF.tsx   # PDF upload & minting UI
│   │   ├── MyNFTs.tsx      # User's NFT collection
│   │   ├── ViewPDF.tsx     # PDF viewing & decryption
│   │   ├── Settings.tsx
│   │   ├── UserInvoices.tsx
│   │   └── ProtectedRoute.tsx
│   ├── utils/              # Frontend utilities
│   │   ├── api.ts         # API client functions
│   │   ├── constants.ts   # Contract address & ABI
│   │   ├── nftCache.ts    # NFT metadata caching
│   │   └── theme.tsx      # Theme provider
│   ├── App.tsx            # Main app component (routing)
│   └── main.tsx           # React entry point
│
└── README.md              # Project documentation
```

---

## 🔑 Key Features

### 1. **PDF Encryption**
- AES-256-CBC encryption with random IV per file
- Encryption key stored in NFT metadata (only accessible to NFT owner)
- Secure encryption key generation

### 2. **Decentralized Storage (Arweave)**
- Files uploaded to Arweave via Bundlr Network
- Immutable, permanent storage
- Metadata JSON also stored on Arweave

### 3. **NFT Minting**
- ERC-721 NFT contract on Polygon
- Each NFT represents ownership of an encrypted PDF
- Metadata includes:
  - Arweave file URL
  - Encryption key (encrypted/hashed)
  - File name, description
  - IV (initialization vector)

### 4. **User Authentication**
- Email/password authentication
- JWT token-based sessions
- MongoDB user storage
- Role-based access (user/admin)

### 5. **Admin Dashboard**
- User management
- Statistics & analytics
- Billing/invoice management
- System monitoring

### 6. **Web3 Integration**
- MetaMask wallet connection
- Polygon network support
- NFT ownership verification
- Transaction signing

---

## 🔄 Workflow

### PDF Upload & Minting Flow

1. **User Uploads PDF** → Frontend sends file to `/api/encrypt-and-upload`
2. **Backend Encrypts** → AES-256-CBC encryption with random key & IV
3. **Get Upload Price** → Calculate Arweave upload cost
4. **Fund Bundlr** → User funds Bundlr wallet (frontend)
5. **Upload to Arweave** → Encrypted file uploaded via Bundlr
6. **Generate Metadata** → Create NFT metadata JSON with encryption details
7. **Upload Metadata** → Metadata JSON uploaded to Arweave
8. **Mint NFT** → Smart contract mints NFT with metadata URL
9. **Store Encryption Key** → Key hash stored in contract (alongside Arweave ID & IV)

### PDF Viewing & Decryption Flow

1. **User Views NFT** → Frontend fetches NFT metadata from contract
2. **Verify Ownership** → Check if user's wallet owns the NFT
3. **Fetch Encrypted File** → Download from Arweave gateway
4. **Extract Encryption Key** → Get key from NFT metadata
5. **Decrypt PDF** → Backend decrypts using key + IV
6. **Serve Decrypted PDF** → Return decrypted PDF to user

---

## 🔐 Security Architecture

### Encryption
- **Algorithm**: AES-256-CBC
- **Key Generation**: Cryptographically secure random keys
- **IV**: Random per-file initialization vector
- **Key Storage**: Stored in NFT metadata (only accessible to owner)

### Authentication
- **JWT Tokens**: Secure session management
- **Password Hashing**: Bcrypt (via Mongoose pre-save hooks)
- **Role-Based Access**: Admin vs. regular user

### Blockchain Security
- **Ownership Verification**: Only NFT owner can decrypt
- **Key Hashing**: Encryption key hash stored in contract
- **Reentrancy Protection**: Smart contract uses ReentrancyGuard

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/me` - Get current user

### PDF Operations (`/api`)
- `POST /api/encrypt-and-upload` - Encrypt PDF (returns encryption key)
- `POST /api/get-arweave-upload-price` - Get upload cost
- `POST /api/get-total-arweave-price` - Get total cost (file + metadata)
- `POST /api/generate-metadata-json` - Generate NFT metadata
- `POST /api/mint-nft-with-arweave-details` - Mint NFT
- `POST /api/automated-upload-and-mint` - Full automated flow
- `GET /api/decrypt/:tokenId` - Decrypt PDF (requires ownership)
- `GET /api/nft-metadata/:tokenId` - Get NFT metadata

### Admin (`/api/admin`)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/invoices` - Get billing invoices

### Statistics (`/api/stats`)
- `GET /api/stats` - Platform statistics

---

## 🎨 Frontend Routes

- `/signin` - Login page
- `/signup` - Registration page
- `/dashboard` - Main dashboard (protected)
  - `/dashboard` - Home
  - `/dashboard/upload` - Upload PDF
  - `/dashboard/my-nfts` - View NFT collection
  - `/dashboard/invoices` - User invoices
  - `/dashboard/settings` - User settings
  - `/dashboard/view/:tokenId` - View/decrypt specific PDF
- `/admin/dashboard` - Admin dashboard (protected)

---

## ⚙️ Configuration

### Environment Variables (Backend)

```env
# Blockchain
PRIVATE_KEY=your_wallet_private_key
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com
# POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com (for testnet)

# Bundlr/Arweave
BUNDLR_NODE=https://node1.bundlr.network
BUNDLR_CURRENCY=matic

# Server
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pdf-encryption

# JWT
JWT_SECRET=your_jwt_secret
```

### Smart Contract

- **Network**: Polygon Mainnet (configurable)
- **Contract**: `PdfNFT.sol` (ERC-721 with extensions)
- **Address**: Stored in `backend/contractAddress.json`

---

## 🔧 Key Utilities

### `backend/utils/encryption.js`
- `encryptFile()` - Encrypts PDF file (AES-256-CBC)
- `decryptData()` - Decrypts hex string data

### `backend/utils/arweave.js`
- `getUploadPrice()` - Calculate upload cost
- `uploadFileToArweave()` - Upload file via Bundlr
- `uploadDataToArweave()` - Upload JSON data
- Bundlr client initialization

### `backend/utils/wallet.js`
- `mintNFTWithMetadata()` - Mint NFT with metadata URL
- `mintNFTDirectly()` - Direct minting (automated flow)
- Contract interaction functions

### `backend/utils/generateMetadata.js`
- `generateMetadata()` - Create NFT metadata JSON following OpenSea standard

---

## 📊 Database Schema

### User Model (MongoDB)
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  name: String,
  role: String (enum: ['user', 'admin']),
  createdAt: Date,
  updatedAt: Date
}
```

### Default Admin
- Email: `admin@gmail.com`
- Password: `admin123`
- Auto-created on server start if doesn't exist

---

## 🚀 Deployment

### Backend
```bash
npm run start:backend
# Server runs on PORT (default: 5000)
```

### Frontend
```bash
npm run dev        # Development
npm run build      # Production build
npm run preview    # Preview production build
```

### Smart Contract
1. Compile: `npm run compile`
2. Deploy: `npm run deploy:contract`
3. Update `backend/contractAddress.json` with deployed address

---

## 🔍 Important Files

1. **`backend/server.js`** - Main server entry, MongoDB connection, default admin creation
2. **`backend/controllers/pdfController.js`** - Core PDF encryption/decryption logic
3. **`contracts/PdfNFT.sol`** - Smart contract (ERC-721 with encryption key storage)
4. **`src/App.tsx`** - Frontend routing & wallet context
5. **`src/components/UploadPDF.tsx`** - PDF upload UI
6. **`src/components/ViewPDF.tsx`** - PDF viewing & decryption UI

---

## 📝 Notes

- **Temporary Files**: Encrypted files stored in `backend/temp/` (cleaned after use)
- **NFT Metadata**: Stored on Arweave, accessible via tokenURI
- **Encryption Key**: Stored in metadata (only NFT owner should access)
- **Retry Logic**: Arweave gateway fetching includes retry logic with exponential backoff
- **File Size Limits**: 50MB upload limit (configurable)
- **Caching**: NFT metadata cached in browser for faster access

---

## 🔗 Dependencies

### Key Libraries
- `@bundlr-network/client` - Arweave uploads
- `ethers` - Blockchain interactions
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT authentication
- `crypto-js` - Encryption utilities
- `express-fileupload` - File upload handling

---

This codebase implements a complete decentralized PDF encryption and NFT minting platform with user authentication, admin dashboard, and secure blockchain integration.
