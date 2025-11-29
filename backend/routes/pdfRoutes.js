import express from 'express';
import { encryptAndUpload,uploadAndEncrypt, decryptFile, getArweaveUploadPrice, generateMetadataJson, serveEncryptedFile, mintNftWithArweaveDetails, getTotalArweavePrice, getNFTMetadata, automatedUploadAndMint, getUserNFTs } from '../controllers/pdfController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/encrypt-upload', encryptAndUpload);

// Automated endpoint that handles entire flow - now requires authentication
router.post('/automated-upload-mint', authenticate, automatedUploadAndMint);

// New endpoint to fetch user's NFTs (no wallet required)
router.get('/user-nfts', authenticate, getUserNFTs);

// Route for decrypting PDF (requires NFT ownership) - now uses authentication
router.post('/decrypt/:tokenId', authenticate, decryptFile);

// New route to fetch NFT metadata from Arweave via backend
router.get('/nft-metadata/:tokenId', getNFTMetadata);

// Route to get Arweave upload price for file only (can be removed later if not needed)
router.post('/arweave-price', getArweaveUploadPrice);

// New route to generate metadata JSON
router.post('/generate-metadata', generateMetadataJson);

// New route to calculate total Arweave upload price for file and metadata
router.post('/total-arweave-price', getTotalArweavePrice);

// New route to handle NFT minting after frontend Arweave uploads
router.post('/mint-nft', mintNftWithArweaveDetails);

// Route to serve the encrypted file to the frontend
router.get('/encrypted-file/:fileId', serveEncryptedFile);

export default router;