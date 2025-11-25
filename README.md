# Decentralized PDF NFT Application

This application allows users to:
1. Upload a PDF file
2. Encrypt it using AES-256-CBC
3. Store the encrypted file on Arweave via Bundlr
4. Mint an NFT on the Polygon blockchain with metadata pointing to the Arweave-hosted file

## Features

- **Encryption**: AES-256-CBC with random IV per file
- **Decentralized Storage**: Bundlr SDK for Arweave uploads (primary storage)
- **Temporary Storage**: Supabase for fast access and fallback (optional)
- **Blockchain & NFT**: ERC721 contract on Polygon (Mumbai testnet or Mainnet)
- **Backend**: Node.js + Express.js
- **Frontend**: React with Tailwind CSS
- **Smart Fallback**: Tries Arweave first, falls back to Supabase if needed

## Setup Instructions

### Prerequisites

1. Node.js and npm installed
2. A wallet with MATIC (for Mumbai testnet or Mainnet)
3. RPC URL for Polygon network

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the `backend/` directory:
   ```
   # Blockchain
   PRIVATE_KEY=your_wallet_private_key_here
   POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com
   # POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com (for testnet)

   # Bundlr/Arweave
   BUNDLR_NODE=https://node1.bundlr.network
   BUNDLR_CURRENCY=matic

   # Supabase (Optional - for temporary storage and fallback)
   # See SUPABASE_SETUP.md for detailed setup instructions
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPABASE_STORAGE_BUCKET=encrypted-pdfs

   # Server
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/pdf-encryption
   JWT_SECRET=your_jwt_secret_here
   ```

4. **Optional**: Set up Supabase for temporary file storage and fallback mechanism. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.
   - Without Supabase: Files will only be stored on Arweave
   - With Supabase: Files are stored on both Arweave (primary) and Supabase (fallback)

### Deployment

1. Compile the smart contract:
   ```
   npm run compile
   ```

2. Deploy the smart contract:
   ```
   npm run deploy:contract
   ```

3. Start the backend server:
   ```
   npm run start:backend
   ```

4. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```

## Usage

1. Open the application in your browser
2. Upload a PDF file
3. The file will be encrypted and uploaded to:
   - **Supabase** (if configured) - for temporary/fast access
   - **Arweave** - for permanent decentralized storage
4. Enter a recipient address and optional metadata
5. Mint the NFT
6. The NFT will contain metadata with both Arweave and Supabase links (if Supabase is configured) and encryption key
7. When viewing/decrypting:
   - System tries Arweave first (primary storage)
   - Falls back to Supabase if Arweave is unavailable (fast retrieval)

## Security Considerations

- The encryption key is stored in the NFT metadata
- Only the NFT owner should have access to this key
- The backend wallet private key should be kept secure

## License

MIT