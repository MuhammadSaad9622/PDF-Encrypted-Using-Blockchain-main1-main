import crypto from 'crypto';
import Bundlr from '@bundlr-network/client';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptFile, decryptData } from '../utils/encryption.js';
import { getUploadPrice, getBundlrAddress, bundlr, getBundlrWithPrivateKey, uploadFileToArweave, uploadDataToArweave } from '../utils/arweave.js';
import { generateMetadata } from '../utils/generateMetadata.js';
import { mintNFTWithMetadata, mintNFTDirectly, contractAddress } from '../utils/wallet.js';
import { uploadFileToSupabase, downloadFileFromSupabase, isSupabaseConfigured } from '../utils/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, '../temp');

export const encryptAndUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const fileId = crypto.randomUUID();
    const originalFilePath = path.join(tempDir, `${fileId}_original.pdf`);
    const encryptedFilePath = path.join(tempDir, `${fileId}_encrypted.pdf`);
    
    // Save original file temporarily
    await pdfFile.mv(originalFilePath);
    
    // Get original file size
    const originalFileSize = fs.statSync(originalFilePath).size;

    // Encrypt the file
    const encryptionKey = await encryptFile(originalFilePath, encryptedFilePath);
    
    console.log('Encryption successful. Generated encryptionKey:', encryptionKey);
    
    // Clean up original temporary file
    fs.unlinkSync(originalFilePath);
    
    // Upload to Supabase in background (non-blocking) for temporary storage
    // This allows Arweave upload to proceed without waiting
    let supabaseUrl = null;
    let supabasePath = null;
    if (isSupabaseConfigured()) {
      // Start Supabase upload in background (fire-and-forget)
      const supabaseFileName = `${fileId}_encrypted.pdf`;
      uploadFileToSupabase(encryptedFilePath, supabaseFileName)
        .then((supabaseResult) => {
          supabaseUrl = supabaseResult.url;
          supabasePath = supabaseResult.path;
          console.log('✅ File uploaded to Supabase in background:', supabaseUrl);
        })
        .catch((supabaseError) => {
          console.warn('⚠️ Background Supabase upload failed (non-critical):', supabaseError.message);
        });
    }
    
    // Keep the encrypted file in temp for the next step (Arweave upload)
    // Supabase upload continues in background

    return res.status(200).json({
      success: true,
      fileId,
      encryptionKey,
      encryptedFilePath: encryptedFilePath, // Return the path to the encrypted file
      originalName: pdfFile.name,
      originalSize: originalFileSize, // Include original file size in the response
      supabaseUrl: supabaseUrl, // Supabase URL for temporary access
      supabasePath: supabasePath // Supabase storage path
      // arweaveId and arweaveUrl will be returned after the Arweave upload step
    });
  } catch (error) {
    console.error('Error in encrypt-upload:', error);
    // Clean up encrypted file if something went wrong after encryption
    if (req.files && req.files.pdf && req.files.pdf.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
        fs.unlinkSync(req.files.pdf.tempFilePath);
    }
    return res.status(500).json({ error: error.message });
  }
};

export const uploadAndEncrypt = async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const fileId = crypto.randomUUID();
    const originalFilePath = path.join(tempDir, `${fileId}_original.pdf`);
    const encryptedFilePath = path.join(tempDir, `${fileId}_encrypted.pdf`);
    
    // Save original file temporarily
    await pdfFile.mv(originalFilePath);
    
    // Encrypt the file
    const encryptionKey = await encryptFile(originalFilePath, encryptedFilePath);
    
    // Upload to Arweave
    const arweaveResult = await uploadToArweave(encryptedFilePath);
    
    // Clean up temporary files
    fs.unlinkSync(originalFilePath);
    fs.unlinkSync(encryptedFilePath);
    
    // Return the necessary data for NFT minting
    res.json({
      arweaveId: arweaveResult.id,
      arweaveUrl: arweaveResult.url,
      encryptionKey,
      metadata: {
        name: pdfFile.name,
        description: 'Encrypted PDF NFT',
        image: arweaveResult.url,
        properties: {
          file: {
            name: pdfFile.name,
            type: pdfFile.mimetype,
            size: pdfFile.size
          },
          encryption: {
            algorithm: 'AES-256-CBC'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in uploadAndEncrypt:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};

export const getArweaveUploadPrice = async (req, res) => {
    try {
        const { encryptedFilePath } = req.body; // Get the path from the request body

        if (!encryptedFilePath || !fs.existsSync(encryptedFilePath)) {
            return res.status(400).json({ error: 'Encrypted file not found or path missing' });
        }

        const price = await getUploadPrice(encryptedFilePath);
        const bundlrAddress = getBundlrAddress();

        return res.status(200).json({
            success: true,
            price: price, // Price in atomic units
            bundlrAddress: bundlrAddress,
        });
    } catch (error) {
        console.error('Error getting Arweave upload price:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const generateMetadataJson = async (req, res) => {
    // This function now receives arweaveId and arweaveUrl from the frontend
    // And generates and returns the metadata JSON
    try {
        const { arweaveId, arweaveUrl, supabaseUrl, encryptionKey, originalName, recipientAddress, name, description, originalSize } = req.body;

        if (!arweaveId || !arweaveUrl || !encryptionKey || !originalName || !recipientAddress) {
             return res.status(400).json({ error: 'Missing required parameters (arweaveId, arweaveUrl, encryptionKey, originalName, or recipientAddress)' });
        }

        // Parse the encryptionKey string into an object
        let parsedEncryptionKey;
        try {
            parsedEncryptionKey = JSON.parse(encryptionKey);
            // Basic validation to ensure it has key and iv
            if (!parsedEncryptionKey || !parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
                 throw new Error('Invalid encryptionKey format');
            }
        } catch (e) {
            console.error('Failed to parse encryptionKey string:', e);
            return res.status(400).json({ error: 'Invalid encryption key format provided.' });
        }

        // Generate metadata (using the received arweaveUrl and optional supabaseUrl)
        const metadata = generateMetadata({
            name: name || `Encrypted PDF: ${originalName}`,
            description: description || 'Encrypted PDF document with secure access',
            arweaveUrl: arweaveUrl,
            supabaseUrl: supabaseUrl || null, // Include Supabase URL if provided
            supabasePath: req.body.supabasePath || null, // Include Supabase path if provided
            encryptionKey: parsedEncryptionKey, // Use the parsed object here
            originalName: originalName,
            originalSize: originalSize
        });

        console.log('Generated metadata for minting:', metadata);

        // Return the metadata JSON to the frontend
        return res.status(200).json({
            success: true,
            metadata: metadata,
        });

    } catch (error) {
        console.error('Error in generateMetadataJson:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const mintNftWithArweaveDetails = async (req, res) => {
    // This function handles minting after frontend Arweave uploads
    try {
        const { arweaveId, arweaveUrl, metadataArweaveUrl, encryptionKey, originalName, recipientAddress } = req.body;

        if (!arweaveId || !arweaveUrl || !metadataArweaveUrl || !encryptionKey || !originalName || !recipientAddress) {
             return res.status(400).json({ error: 'Missing required parameters for minting' });
        }

         // Parse the encryptionKey string into an object (needed for IV and key hash)
        let parsedEncryptionKey;
        try {
            parsedEncryptionKey = JSON.parse(encryptionKey);
            // Basic validation to ensure it has key and iv
            if (!parsedEncryptionKey || !parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
                 throw new Error('Invalid encryptionKey format');
            }
        } catch (e) {
            console.error('Failed to parse encryptionKey string in mintNftWithArweaveDetails:', e);
            return res.status(400).json({ error: 'Invalid encryption key format provided for minting.' });
        }

        // Mint the NFT using the metadata Arweave URL and extracted details
    const mintResult = await mintNFTWithMetadata(
      recipientAddress,
            metadataArweaveUrl,
      arweaveId,
            parsedEncryptionKey.iv, // Use iv from the parsed object
             ethers.keccak256(ethers.toUtf8Bytes(parsedEncryptionKey.key)) // Use key from the parsed object
    );
    
    console.log('Prepared Mint transaction request:', mintResult);

    return res.status(200).json({
      success: true,
            transactionRequest: mintResult, // Return the transaction request for the frontend to sign and send
            metadataUrl: metadataArweaveUrl,
            arweaveId: arweaveId, // Return the arweaveId for confirmation
            arweaveUrl: arweaveUrl // Return the arweaveUrl for confirmation
        });

  } catch (error) {
        console.error('Error in mintNftWithArweaveDetails:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const mintNFT = async (req, res) => {
  // This function is now redundant
  console.log('MintNFT endpoint hit - this should not happen in the new flow unless intended.');
  return res.status(405).json({ error: 'Method not allowed in this flow.' });
};
export const decryptFile = async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const userId = req.userId; // From authentication middleware

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // First, verify ownership via database (userId)
    const NFT = (await import('../models/NFT.js')).default;
    const nftRecord = await NFT.findOne({ tokenId: tokenId.toString() });

    if (!nftRecord) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    // Check if user owns this NFT via userId
    const mongoose = (await import('mongoose')).default;
    const userIdObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    if (!nftRecord.userId || nftRecord.userId.toString() !== userIdObjectId.toString()) {
      // Fallback: If no userId stored, check blockchain ownership
      // (for backward compatibility with older NFTs)
      const { walletAddress } = req.body;
      if (walletAddress) {
        const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');
        const contract = new ethers.Contract(
          contractAddress,
          ['function ownerOf(uint256) view returns (address)'],
          provider
        );
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      } else {
        return res.status(403).json({ error: 'Not authorized - you do not own this NFT' });
      }
    }

    // Initialize provider and contract for tokenURI
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');
    const contract = new ethers.Contract(
      contractAddress,
      ['function tokenURI(uint256) view returns (string)'],
      provider
    );

    // Get metadata with retry logic - try multiple gateways
    const tokenURI = await contract.tokenURI(tokenId);
    
    // Extract Arweave ID from tokenURI
    let metadataArweaveId = tokenURI;
    if (tokenURI.includes('/')) {
      metadataArweaveId = tokenURI.split('/').pop() || tokenURI;
    }
    // Remove any query parameters or fragments
    metadataArweaveId = metadataArweaveId.split('?')[0].split('#')[0];
    
    // Try only primary gateway for metadata (faster)
    const metadataGateways = [
      `https://arweave.net/${metadataArweaveId}` // PRIMARY gateway
    ];
    
    let metadata = null;
    const metadataMaxRetries = 2; // Reduced retries for faster failure detection
    let metadataLastError = null;

    console.log(`📋 Fetching metadata for token ${tokenId} from Arweave gateways (Arweave ID: ${metadataArweaveId})...`);

    for (let attempt = 0; attempt < metadataMaxRetries && !metadata; attempt++) {
      for (const gatewayUrl of metadataGateways) {
      try {
          console.log(`Fetching metadata from ${gatewayUrl} (attempt ${attempt + 1}/${metadataMaxRetries})`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (reduced for faster failure)

          try {
            const metadataResponse = await fetch(gatewayUrl, {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json, text/plain, */*'
              }
          });
          
          clearTimeout(timeoutId);
          
          if (!metadataResponse.ok) {
              if (metadataResponse.status === 404) {
                console.warn(`Metadata not found at ${gatewayUrl} (404), trying next gateway...`);
                continue; // Try next gateway
              }
            throw new Error(`HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`);
          }
          
          metadata = await metadataResponse.json();
            console.log(`✅ Metadata fetched successfully from ${gatewayUrl}`);
            break; // Success, exit both loops
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
              console.warn(`Metadata fetch timeout for ${gatewayUrl} after 15s, trying next gateway...`);
              metadataLastError = fetchError;
              continue; // Try next gateway
          }
          throw fetchError;
        }
      } catch (error) {
          // Don't store JSON parse errors as the main error - they're usually just gateway returning HTML
          if (!error.message?.includes('JSON') && !error.message?.includes('<!DOCTYPE')) {
        metadataLastError = error;
          } else {
            // For JSON errors, create a more descriptive error
            if (!metadataLastError) {
              metadataLastError = new Error(`Gateway ${gatewayUrl} returned invalid response (may be an error page)`);
            }
          }
          console.warn(`Metadata fetch failed from ${gatewayUrl}:`, error.message);
          // Continue to next gateway
          continue;
        }
      }
      
      if (metadata) break; // Success, exit retry loop
      
      // If all gateways failed, wait before retrying
      if (attempt < metadataMaxRetries - 1 && !metadata) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
        console.log(`All metadata gateways failed on attempt ${attempt + 1}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If metadata fetch failed, try to get encryption details from database
    let encryptionDetails = null;
    let supabasePath = null;
    let supabaseUrl = null;
    let arweaveId = null;
    let arweaveUrl = null;

    if (!metadata) {
      console.error(`❌ Failed to fetch metadata after ${metadataMaxRetries} attempts from all gateways`);
      console.log(`📋 Metadata not available (propagating), trying to get encryption details from database...`);
      
      // Try to get encryption details from database (stored during minting)
      try {
        const NFT = (await import('../models/NFT.js')).default;
        const nftRecord = await NFT.findOne({ tokenId: tokenId.toString() });
        
        if (nftRecord && nftRecord.encryptionKey) {
          console.log(`✅ Found NFT record in database for tokenId ${tokenId}`);
          encryptionDetails = JSON.parse(nftRecord.encryptionKey);
          supabasePath = nftRecord.supabasePath;
          supabaseUrl = nftRecord.supabaseUrl;
          arweaveId = nftRecord.arweaveId;
          arweaveUrl = nftRecord.arweaveUrl;
          
          console.log(`📋 Using encryption details from database (metadata still propagating on Arweave)`);
          console.log(`📋 Supabase path: ${supabasePath || 'Not available'}`);
          console.log(`📋 Supabase URL: ${supabaseUrl || 'Not available'}`);
        } else {
          console.warn(`⚠️ NFT record not found in database for tokenId ${tokenId}`);
          const errorMessage = `Cannot decrypt NFT: Metadata is not available on Arweave (still propagating) and no database record found for tokenId ${tokenId}. `;
          const suggestion = `This NFT may have been minted before the database fallback feature was added. `;
          const action = `Please wait for metadata to propagate on Arweave (this can take several minutes) or contact support if this NFT was recently minted.`;
          throw new Error(errorMessage + suggestion + action);
        }
      } catch (dbError) {
        console.error('❌ Error fetching from database:', dbError.message);
        // Check if this is our custom error (record not found) or an actual database error
        if (dbError.message?.includes('Cannot decrypt NFT')) {
          throw dbError; // Re-throw our custom error as-is
        }
        // Actual database connection/query error
        throw new Error(`Database lookup failed for tokenId ${tokenId}. Error: ${dbError.message}. ` +
          `Metadata is not available on Arweave (still propagating). Please wait for metadata to propagate or contact support.`);
      }
    } else {
      // Metadata was successfully fetched, extract details from it
    // Parse encryption details
      encryptionDetails = metadata.properties?.encryption;
    if (typeof encryptionDetails === 'string') {
      encryptionDetails = JSON.parse(encryptionDetails);
    }
      
      // Extract storage URLs from metadata
      const storageInfo = metadata.properties?.storage || {};
      arweaveUrl = storageInfo.arweave || metadata.properties?.file?.uri;
      supabaseUrl = storageInfo.supabase || metadata.properties?.file?.fallbackUri;
      supabasePath = storageInfo.supabasePath || metadata.properties?.file?.supabasePath;
      
      // Extract Arweave ID
      arweaveId = arweaveUrl ? arweaveUrl.split('/').pop() : null;
    }
    
    if (!encryptionDetails?.key || !encryptionDetails?.iv) {
      throw new Error('Invalid encryption details - missing key or IV');
    }
    
    console.log('📋 Storage info:', {
      arweaveUrl: arweaveUrl || 'Missing',
      supabaseUrl: supabaseUrl || 'Missing',
      supabasePath: supabasePath || 'Missing',
      arweaveId: arweaveId || 'Missing',
      source: metadata ? 'metadata' : 'database',
      supabaseConfigured: isSupabaseConfigured()
    });
    
    if (!arweaveId && !supabaseUrl && !supabasePath) {
      throw new Error('No storage URL found (neither Arweave nor Supabase). This NFT may have been minted before Supabase integration was added.');
    }

    let encryptedData = null;
    let lastError = null;
    const maxRetries = 2; // Reduced retries for faster fallback to Supabase
    const timeout = 60000; // 1 minute timeout (reduced from 2 minutes)

    // If metadata is not available (propagating), skip Arweave and fetch directly from Supabase
    if (!metadata) {
      console.log(`⚠️ Metadata not available (still propagating), fetching encrypted file directly from Supabase...`);
      
      if (!supabasePath && !supabaseUrl) {
        throw new Error('Metadata is propagating and Supabase path/URL not found in database. Please wait for metadata to propagate on Arweave or ensure Supabase was configured during upload.');
      }
      
      // Fetch directly from Supabase (skip Arweave entirely when metadata is not available)
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Cannot fetch file while metadata is propagating.');
      }
      
      // Use path from database first, then try to extract from URL
      let filePathToDownload = supabasePath || null;
      
      if (!filePathToDownload && supabaseUrl) {
        console.log(`📥 Attempting to extract path from Supabase URL: ${supabaseUrl}`);
        try {
          const urlObj = new URL(supabaseUrl);
          const pathname = urlObj.pathname;
          const pathMatch = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
          if (pathMatch) {
            filePathToDownload = pathMatch[1];
            console.log(`✅ Extracted Supabase path from URL: ${filePathToDownload}`);
          }
        } catch (urlError) {
          console.warn('⚠️ Could not parse Supabase URL:', urlError.message);
        }
      }
      
      // Try downloading from Supabase using path first (more reliable)
      if (filePathToDownload) {
        try {
          console.log(`📥 Fetching encrypted file from Supabase using path: ${filePathToDownload}`);
          const supabaseBuffer = await downloadFileFromSupabase(filePathToDownload);
          encryptedData = supabaseBuffer.toString('utf8').trim();
          if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
            encryptedData = supabaseBuffer.toString('hex');
          }
          console.log(`✅ Successfully fetched encrypted data from Supabase (metadata propagating), hex length: ${encryptedData.length} chars`);
        } catch (pathDownloadError) {
          console.warn('⚠️ Failed to download using path, will try direct URL:', pathDownloadError.message);
          filePathToDownload = null;
        }
      }
      
      // Fallback: try to download directly from URL
      if (!encryptedData && supabaseUrl) {
        try {
          console.log(`📥 Attempting direct download from Supabase URL...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
          
          const response = await fetch(supabaseUrl, {
            signal: controller.signal,
            headers: { 'Accept': 'text/plain, application/octet-stream, */*' }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          encryptedData = buffer.toString('utf8').trim();
          if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
            encryptedData = buffer.toString('hex');
          }
          console.log(`✅ Successfully fetched encrypted data from Supabase URL (metadata propagating), hex length: ${encryptedData.length} chars`);
        } catch (fetchError) {
          throw new Error(`Failed to fetch from Supabase while metadata is propagating: ${fetchError.message}`);
        }
      }
      
      if (!encryptedData) {
        throw new Error('Failed to fetch encrypted file from Supabase while metadata is propagating. Please wait for metadata to propagate on Arweave.');
      }
    } else {
      // Metadata is available, try Arweave first (PRIMARY storage)
      console.log(`Starting encrypted data fetch - trying Arweave FIRST (PRIMARY storage)...`);
      
      // Fetch encrypted data with retry logic - only primary gateway
      const arweaveGateways = [
        `https://arweave.net/${arweaveId}` // PRIMARY gateway
      ];
      
      // ALWAYS try Arweave first with full retry logic
      // Only fallback to Supabase if ALL Arweave attempts fail
      if (arweaveId) {
        console.log(`Attempting to fetch from Arweave (PRIMARY) for ID: ${arweaveId}`);
        
        // Try to fetch from Arweave with full retry logic
        for (let attempt = 0; attempt < maxRetries && !encryptedData; attempt++) {
      for (const gatewayUrl of arweaveGateways) {
        try {
          console.log(`Attempting to fetch encrypted data from ${gatewayUrl} (attempt ${attempt + 1}/${maxRetries})`);
          
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.error(`Request timeout after ${timeout}ms for ${gatewayUrl}`);
            controller.abort();
          }, timeout);

          try {
            console.log(`Starting fetch request to ${gatewayUrl}...`);
            const fetchStartTime = Date.now();
            
            // Add connection timeout check (10 seconds to establish connection)
            const connectionTimeout = 10000;
            let connectionEstablished = false;
            
            const connectionCheck = setTimeout(() => {
              if (!connectionEstablished) {
                console.error(`Connection not established after ${connectionTimeout}ms for ${gatewayUrl}, aborting...`);
                controller.abort();
              }
            }, connectionTimeout);
            
            const response = await fetch(gatewayUrl, {
              signal: controller.signal,
              headers: {
                'Accept': 'text/plain, */*',
              }
            });
            
            clearTimeout(connectionCheck);
            connectionEstablished = true;

            const fetchTime = Date.now() - fetchStartTime;
            console.log(`Fetch response received in ${fetchTime}ms, status: ${response.status}`);

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Get content length if available
            const contentLengthHeader = response.headers.get('content-length');
            const fileSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
            if (fileSize) {
              console.log(`Expected content length: ${fileSize} bytes`);
            }

            // Encrypted file is stored as hex string on Arweave (uploaded as binary)
            // Optimize: Use arrayBuffer() directly for faster downloads (works well for files < 10MB)
            console.log('Reading response body...');
            const readStartTime = Date.now();
            // Use streaming for files > 1MB to avoid arrayBuffer() hanging on slow connections
            const useStreaming = fileSize && fileSize > 1 * 1024 * 1024; // Stream files > 1MB
            
            let arrayBuffer;
            
            if (useStreaming && response.body && typeof response.body.getReader === 'function') {
              // Use streaming for files > 1MB to avoid hanging
              console.log(`Using streaming approach for file (${fileSize} bytes)...`);
              const reader = response.body.getReader();
              const chunks = [];
              let totalBytes = 0;
              let lastProgressLog = Date.now();

              try {
                while (true) {
                  // Reduced timeout for chunks (10 seconds per chunk for faster failure detection)
                  const chunkTimeout = setTimeout(() => {
                    console.error('Chunk read timeout, aborting...');
                    reader.cancel();
                  }, 10000);
                  
                  let readResult;
                  try {
                    readResult = await reader.read();
                  } catch (readError) {
                    clearTimeout(chunkTimeout);
                    throw readError;
                  }
                  
                  clearTimeout(chunkTimeout);
                  
                  const { done, value } = readResult;
                  
                  if (done) {
                    console.log('Stream reading completed');
                    break;
                  }
                  
                  chunks.push(value);
                  totalBytes += value.length;
                  
                  // Log progress every 10 seconds or every 500KB to reduce overhead
                  const now = Date.now();
                  if (now - lastProgressLog > 10000 || totalBytes % (500 * 1024) < value.length) {
                    const percent = fileSize ? ((totalBytes / fileSize) * 100).toFixed(1) : '?';
                    console.log(`Downloaded ${totalBytes} bytes (${percent}%)...`);
                    lastProgressLog = now;
                  }
                }
              } catch (streamError) {
                reader.releaseLock();
                throw streamError;
              } finally {
                reader.releaseLock();
              }

              // Combine all chunks
              arrayBuffer = new Uint8Array(totalBytes);
              let offset = 0;
              for (const chunk of chunks) {
                arrayBuffer.set(chunk, offset);
                offset += chunk.length;
              }
            } else {
              // Use direct arrayBuffer() for faster downloads (most files)
              // Add timeout wrapper to prevent hanging
              console.log(`Using direct arrayBuffer approach${fileSize ? ` (${fileSize} bytes)` : ''}...`);
              
              // Create a timeout promise for arrayBuffer operation
              const arrayBufferTimeout = 60000; // 60 seconds max for arrayBuffer
              const arrayBufferPromise = response.arrayBuffer();
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                  reject(new Error(`arrayBuffer() timeout after ${arrayBufferTimeout}ms`));
                }, arrayBufferTimeout);
              });
              
              let buffer;
              try {
                buffer = await Promise.race([arrayBufferPromise, timeoutPromise]);
              } catch (arrayBufferError) {
                console.error('arrayBuffer() failed:', arrayBufferError.message);
                // If arrayBuffer times out or fails, try streaming as fallback
                if (response.body && typeof response.body.getReader === 'function') {
                  console.log('Falling back to streaming approach due to arrayBuffer timeout...');
                  const reader = response.body.getReader();
                  const chunks = [];
                  let totalBytes = 0;

                  try {
                    while (true) {
                      const readResult = await Promise.race([
                        reader.read(),
                        new Promise((_, reject) => 
                          setTimeout(() => reject(new Error('Chunk read timeout')), 10000)
                        )
                      ]);
                      
                      const { done, value } = readResult;
                      
                      if (done) break;
                      
                      chunks.push(value);
                      totalBytes += value.length;
                      
                      // Log progress every 500KB to reduce overhead
                      if (totalBytes % (500 * 1024) < value.length) {
                        const percent = fileSize ? ((totalBytes / fileSize) * 100).toFixed(1) : '?';
                        console.log(`Streamed ${totalBytes} bytes (${percent}%)...`);
                      }
                    }
                  } finally {
                    reader.releaseLock();
                  }

                  // Combine chunks
                  arrayBuffer = new Uint8Array(totalBytes);
                  let offset = 0;
                  for (const chunk of chunks) {
                    arrayBuffer.set(chunk, offset);
                    offset += chunk.length;
                  }
                } else {
                  throw arrayBufferError;
                }
              }
              
              if (!arrayBuffer) {
                arrayBuffer = new Uint8Array(buffer);
              }
            }

            const readTime = Date.now() - readStartTime;
            console.log(`Data read completed in ${readTime}ms, total size: ${arrayBuffer.byteLength} bytes`);
            
            if (arrayBuffer.byteLength === 0) {
              throw new Error('Received empty encrypted data');
            }
            
            // Convert binary buffer to hex string
            // The file contains hex string data, so we convert the buffer to string
            console.log('Converting buffer to hex string...');
            encryptedData = Buffer.from(arrayBuffer).toString('utf8').trim();
            
            // Validate it's a hex string
            if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
              // If not valid hex, the data might be corrupted or in wrong format
              // Try converting the binary directly to hex (double encoding case)
              console.warn('Data was not in expected hex string format, using binary->hex conversion');
              encryptedData = Buffer.from(arrayBuffer).toString('hex');
            }
            
            console.log(`Successfully fetched encrypted data from ${gatewayUrl}, hex length: ${encryptedData.length} chars, binary size: ${arrayBuffer.byteLength} bytes`);
            
            break; // Success, exit both loops
          } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error(`Fetch error from ${gatewayUrl}:`, fetchError.message);
            
            if (fetchError.name === 'AbortError') {
              throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw fetchError;
          }
        } catch (error) {
          lastError = error;
          console.warn(`Failed to fetch from ${gatewayUrl}:`, error.message);
          
          // If this was a socket error and we have more attempts, continue
          if (error.message?.includes('terminated') || error.message?.includes('socket') || error.message?.includes('ECONNRESET')) {
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Try next gateway or retry
            }
          }
        }
      }

      if (encryptedData) break; // Success, exit retry loop
        }
      
        // Log result of Arweave attempts
        if (encryptedData) {
          console.log(`✅ Successfully fetched file from Arweave (PRIMARY storage)`);
        } else {
          console.log(`❌ Failed to fetch from Arweave after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown'}`);
        }
      }
    }

    // If Arweave fetch failed after all attempts, try Supabase as fallback
    if (!encryptedData) {
      // Check if Supabase is available and configured
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase is not configured - cannot use Supabase fallback');
      } else if (!supabaseUrl && !supabasePath) {
        console.warn('⚠️ Supabase URL not found in metadata - cannot use Supabase fallback');
      } else {
        // Try Supabase fallback
        try {
          console.log('⚠️ Arweave fetch failed after all attempts, now trying Supabase fallback...');
          
          // Use path from metadata first, then try to extract from URL
          let filePathToDownload = supabasePath || null;
          
          if (!filePathToDownload && supabaseUrl) {
            console.log(`📥 Attempting to extract path from Supabase URL: ${supabaseUrl}`);
            
            // Extract Supabase file path from URL
            // Supabase URLs typically look like:
            // - https://xxx.supabase.co/storage/v1/object/public/bucket/path/file.pdf
            // - https://xxx.supabase.co/storage/v1/object/sign/bucket/path/file.pdf?... (signed URLs)
        
            try {
              const urlObj = new URL(supabaseUrl);
              const pathname = urlObj.pathname;
              
              // Pattern 1: /storage/v1/object/public/bucket/path/to/file
              // Pattern 2: /storage/v1/object/sign/bucket/path/to/file
              const pathMatch = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/);
              if (pathMatch) {
                filePathToDownload = pathMatch[1];
                console.log(`✅ Extracted Supabase path from URL: ${filePathToDownload}`);
              } else {
                // Pattern 3: Look for bucket name in path
                const segments = pathname.split('/').filter(s => s);
                const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'encrypted-pdfs';
                const bucketIndex = segments.findIndex(s => s === bucketName || s.includes('encrypted'));
                if (bucketIndex !== -1 && segments[bucketIndex + 1]) {
                  filePathToDownload = segments.slice(bucketIndex + 1).join('/');
                  console.log(`✅ Extracted Supabase path by bucket name: ${filePathToDownload}`);
                }
              }
            } catch (urlError) {
              console.warn('⚠️ Could not parse Supabase URL:', urlError.message);
              console.warn('Will try direct URL download instead');
            }
          }
          
          // Try downloading from Supabase using path first (more reliable)
          if (filePathToDownload) {
            try {
              console.log(`📥 Attempting to download from Supabase using path: ${filePathToDownload}`);
              const supabaseBuffer = await downloadFileFromSupabase(filePathToDownload);
              
              // Convert buffer to hex string (same format as Arweave)
              encryptedData = supabaseBuffer.toString('utf8').trim();
              
              // Validate it's a hex string
              if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
                console.warn('⚠️ Data from Supabase was not in expected hex string format, using binary->hex conversion');
                encryptedData = supabaseBuffer.toString('hex');
              }
              
              console.log(`✅ Successfully fetched encrypted data from Supabase (using path), hex length: ${encryptedData.length} chars`);
            } catch (pathDownloadError) {
              console.warn('⚠️ Failed to download using path, will try direct URL:', pathDownloadError.message);
              filePathToDownload = null; // Reset to try URL download
            }
          }
          
          // Fallback: try to download directly from URL (for signed URLs or if path download fails)
          if (!encryptedData && supabaseUrl) {
            let timeoutId = null;
            try {
              console.log(`📥 Attempting direct download from Supabase URL (fallback method)...`);
              const controller = new AbortController();
              timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
              
              const response = await fetch(supabaseUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/plain, application/octet-stream, */*',
                }
              });
              
              if (timeoutId) clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              encryptedData = buffer.toString('utf8').trim();
              
              // Validate it's a hex string
              if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
                console.warn('⚠️ Data from Supabase URL was not in expected hex format, converting...');
                encryptedData = buffer.toString('hex');
              }
              
              console.log(`✅ Successfully fetched encrypted data from Supabase URL, hex length: ${encryptedData.length} chars`);
            } catch (fetchError) {
              if (timeoutId) clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                throw new Error('Supabase download timeout after 60s');
              }
              throw fetchError;
            }
          }
          
          if (!encryptedData) {
            throw new Error('Supabase download failed: No data retrieved from either path or URL method');
          }
        } catch (supabaseError) {
          console.error('❌ Supabase fallback failed:', supabaseError.message);
          console.error('Supabase error details:', supabaseError);
          console.error('Arweave errors:', lastError?.message || 'None captured');
          throw new Error(`Failed to fetch encrypted data from both Arweave and Supabase. Arweave: ${lastError?.message || 'All attempts failed'}, Supabase: ${supabaseError.message}`);
        }
      }
    }

    if (!encryptedData) {
      throw new Error(`Failed to fetch encrypted data after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    // Decrypt the file
    const decrypted = decryptData(encryptedData, encryptionDetails);

    // Get filename from metadata if available, otherwise use default
    const fileName = metadata?.properties?.file?.name || `decrypted-${tokenId}.pdf`;

    // Send decrypted file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(decrypted);

  } catch (error) {
    console.error('❌ Decryption failed:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'PDF decryption failed';
    let statusCode = 500;
    
    if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out while fetching encrypted file. The file may be large or the network connection is slow. Please try again.';
      statusCode = 504;
    } else if (error.message?.includes('terminated') || error.message?.includes('socket') || error.message?.includes('ECONNRESET')) {
      errorMessage = 'Connection was interrupted while downloading the encrypted file. Please try again.';
      statusCode = 502;
    } else if (error.message?.includes('Not authorized') || error.message?.includes('403')) {
      errorMessage = 'You do not own this NFT.';
      statusCode = 403;
    } else if (error.message?.includes('Invalid encryption')) {
      errorMessage = 'Failed to decrypt PDF. Encryption keys may be invalid or corrupted.';
      statusCode = 400;
    } else if (error.message?.includes('No storage URL found')) {
      errorMessage = 'No storage URL found in NFT metadata. This NFT may have been minted before storage integration was added.';
      statusCode = 404;
    } else if (error.message?.includes('Supabase is not configured')) {
      errorMessage = 'Supabase fallback is not configured. Arweave is the only storage option.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ 
      error: 'PDF decryption failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      tokenId: req.params.tokenId
    });
  }
};
// New controller function to fetch NFT metadata from Arweave via backend
export const getNFTMetadata = async (req, res) => {
  try {
    console.log('Incoming request: GET /api/nft-metadata/' + req.params.tokenId);
    console.log('Attempting to fetch NFT metadata...');

    const tokenId = req.params.tokenId;

    // Validate input parameters
    if (!tokenId) {
      console.log('Missing required parameters for fetching metadata (tokenId)');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Fetching metadata for token:', tokenId);

    // Initialize Ethereum provider
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');

    if (!contractAddress) {
      console.error('Contract address not loaded in getNFTMetadata');
      return res.status(500).json({ error: 'NFT contract address not configured in backend.' });
    }

    // Initialize contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ['function tokenURI(uint256 tokenId) view returns (string)'],
      provider
    );

    console.log('getNFTMetadata: Contract instance created. Calling tokenURI...');
    // Get tokenURI from contract
    const tokenURI = await contract.tokenURI(tokenId);
    console.log('getNFTMetadata: Fetched tokenURI:', tokenURI);

    // Extract Arweave transaction ID from tokenURI
    let arweaveId = tokenURI;
    if (tokenURI.includes('/')) {
      arweaveId = tokenURI.split('/').pop() || tokenURI;
    }
    
    // Fetch metadata from multiple Arweave gateways (optimized)
    console.log('getNFTMetadata: Fetching metadata from Arweave gateways...', arweaveId);
    
    const gateways = [
      `https://arweave.net/${arweaveId}` // PRIMARY gateway
    ];

    let metadata = null;
    let lastError = null;
    const maxRetries = 2; // Reduced retries for faster failure

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      for (const gatewayUrl of gateways) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          const response = await fetch(gatewayUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json, text/plain, */*',
            }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            metadata = await response.json();
            console.log(`✅ Metadata fetched from ${gatewayUrl} on attempt ${attempt + 1}`);
            break; // Success, exit both loops
          } else if (response.status === 404) {
            // Continue to next gateway
            continue;
          }
        } catch (error) {
          lastError = error;
          // Continue to next gateway
          continue;
        }
      }

      if (metadata) break; // If metadata found, exit retry loop

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
        console.log(`⏳ Retrying metadata fetch in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If Arweave fetch failed, try to construct metadata from database
    if (!metadata) {
      console.log('getNFTMetadata: Arweave fetch failed, trying to fetch from database...');
      
      try {
        const NFT = (await import('../models/NFT.js')).default;
        const { generateMetadata } = await import('../utils/generateMetadata.js');
        
        // Try to find NFT in database
        const nftRecord = await NFT.findOne({ tokenId: tokenId.toString() });
        
        if (nftRecord) {
          console.log('getNFTMetadata: Found NFT in database, constructing metadata...');
          
          // Parse encryption key
          let encryptionKey = {};
          try {
            encryptionKey = JSON.parse(nftRecord.encryptionKey);
          } catch (parseError) {
            console.warn('getNFTMetadata: Could not parse encryption key from database');
          }
          
          // Construct metadata from database
          metadata = generateMetadata({
            name: nftRecord.originalName 
              ? `Encrypted PDF: ${nftRecord.originalName}` 
              : `Encrypted PDF #${tokenId}`,
            description: 'Encrypted PDF document with secure access',
            arweaveUrl: nftRecord.arweaveUrl || null,
            supabaseUrl: nftRecord.supabaseUrl || null,
            supabasePath: nftRecord.supabasePath || null,
            encryptionKey: encryptionKey,
            originalName: nftRecord.originalName || `encrypted_${tokenId}.pdf`,
            originalSize: null
          });
          
          console.log('getNFTMetadata: ✅ Successfully constructed metadata from database');
          console.log('getNFTMetadata: 📦 Using Supabase as storage fallback:', {
            supabaseUrl: nftRecord.supabaseUrl ? 'Available' : 'Not available',
            supabasePath: nftRecord.supabasePath ? 'Available' : 'Not available',
            arweaveUrl: nftRecord.arweaveUrl ? 'Available (but failed)' : 'Not available'
          });
        } else {
          console.log('getNFTMetadata: NFT not found in database either');
        }
      } catch (dbError) {
        console.error('getNFTMetadata: Error fetching from database:', dbError.message);
      }
    }

    // If still no metadata after database fallback, return error
    if (!metadata) {
      console.error('getNFTMetadata: Failed to fetch metadata from Arweave and database');
      return res.status(404).json({ 
        error: 'Metadata not yet available',
        message: 'The NFT metadata is not available on Arweave and was not found in the database. If you just minted this NFT, please wait a few moments for Arweave propagation.',
        tokenId: tokenId,
        tokenURI: tokenURI
      });
    }

    // Send the metadata back to the frontend
    res.status(200).json(metadata);

  } catch (error) {
    console.error('Error in getNFTMetadata:', error);
    res.status(500).json({ 
      error: 'Failed to fetch NFT metadata',
      details: error.message 
    });
  }
};

// New controller function to serve the encrypted file
export const serveEncryptedFile = async (req, res) => {
  try {
    const { fileId } = req.params; // Get fileId from route parameters
    const encryptedFileName = `${fileId}_encrypted.pdf`;
    const encryptedFilePath = path.join(tempDir, encryptedFileName);

    console.log(`Attempting to serve file at: ${encryptedFilePath}`);

    // Check if the file exists
    if (!fs.existsSync(encryptedFilePath)) {
      console.error(`Encrypted file not found: ${encryptedFilePath}`);
      return res.status(404).json({ error: 'Encrypted file not found.' });
    }

    // Send the file
    res.setHeader('Content-Type', 'application/octet-stream'); // Or appropriate content type if known
    const readStream = fs.createReadStream(encryptedFilePath);
    console.log('Read stream created for file:', encryptedFilePath);

    readStream.on('data', (chunk) => {
      console.log('Streaming chunk of size:', chunk.length);
    });

    readStream.pipe(res);
    
    readStream.on('error', (err) => {
      console.error('Error streaming encrypted file:', err);
      res.status(500).send('Error serving file');
    });
    
    readStream.on('end', () => {
      console.log('Finished streaming encrypted file.');
      // Optional: Clean up the temporary file after it has been served successfully.
      // This depends on your cleanup strategy. You might prefer a scheduled cleanup task.
       if (fs.existsSync(encryptedFilePath)) {
           fs.unlinkSync(encryptedFilePath);
       }
    });

  } catch (error) {
    console.error('Error in serveEncryptedFile:', error);
    return res.status(500).json({ error: error.message });
  }
};

// New controller function to calculate total Arweave upload price for file and metadata
export const getTotalArweavePrice = async (req, res) => {
    try {
        const { encryptedFilePath, originalName, recipientAddress, name, description, arweaveId, arweaveUrl, encryptionKey } = req.body;

        // Validate encrypted file path
        if (!encryptedFilePath || !fs.existsSync(encryptedFilePath)) {
            return res.status(400).json({ error: 'Encrypted file not found or path missing' });
        }

        // 1. Get price for the encrypted file
        const filePrice = await getUploadPrice(encryptedFilePath);
        const filePriceBigInt = BigInt(filePrice); // Convert price string to BigInt

        // 2. Generate metadata JSON (needed to calculate its size for pricing)
         let parsedEncryptionKey;
        try {
            parsedEncryptionKey = JSON.parse(encryptionKey);
             if (!parsedEncryptionKey || !parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
                 throw new Error('Invalid encryptionKey format');
            }
        } catch (e) {
             console.error('Failed to parse encryptionKey string in getTotalArweavePrice:', e);
            return res.status(400).json({ error: 'Invalid encryption key format provided.' });
        }

        const metadata = generateMetadata({
            name: name || `Encrypted PDF: ${originalName}`,
            description: description || 'Encrypted PDF document with secure access',
            arweaveUrl: arweaveUrl, // Note: arweaveUrl might not be available yet here, using file's expected URL
            encryptionKey: parsedEncryptionKey,
            originalName: originalName
        });

        const metadataString = JSON.stringify(metadata);

        // 3. Get price for the metadata JSON
        // Use the bundlr instance imported from arweave.js for pricing
        const metadataPrice = await bundlr.getPrice(Buffer.byteLength(metadataString));
        const metadataPriceBigInt = BigInt(metadataPrice.toString()); // Convert BigNumber price to BigInt

        // 4. Calculate total price
        const totalprice = filePriceBigInt + metadataPriceBigInt;

        console.log(`Total upload cost (file + metadata): ${totalprice.toString()} atomic units`);

        return res.status(200).json({
            success: true,
            totalPrice: totalprice.toString(), // Return total price as string
            bundlrAddress: getBundlrAddress(), // Include bundlr address for frontend funding
        });

    } catch (error) {
        console.error('Error getting total Arweave upload price:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Automated endpoint that handles the entire PDF upload, encryption, Arweave upload, and NFT minting process
 * Uses private key from environment for all blockchain operations
 */
export const automatedUploadAndMint = async (req, res) => {
  try {
    // Validate required fields
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Get userId from authenticated request
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check subscription status
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active subscription
    if (user.subscriptionStatus !== 'active') {
      return res.status(403).json({ 
        error: 'Active subscription required. Please subscribe to upload files.',
        requiresSubscription: true,
        currentStatus: user.subscriptionStatus
      });
    }

    // Check if subscription has expired
    if (user.subscriptionEndDate && new Date() > user.subscriptionEndDate) {
      user.subscriptionStatus = 'expired';
      await user.save();
      return res.status(403).json({ 
        error: 'Your subscription has expired. Please renew your subscription to continue uploading files.',
        requiresSubscription: true,
        expiredDate: user.subscriptionEndDate
      });
    }

    const { recipientAddress, name, description } = req.body;

    // If no recipientAddress provided, use backend wallet address
    // This allows minting without user wallet connection
    let finalRecipientAddress = recipientAddress;
    if (!finalRecipientAddress) {
      const { getBackendWalletAddress } = await import('../utils/wallet.js');
      finalRecipientAddress = getBackendWalletAddress();
      console.log(`No recipient address provided, using backend wallet: ${finalRecipientAddress}`);
    }

    // Validate private key is available
    if (!process.env.PRIVATE_KEY) {
      return res.status(500).json({ error: 'PRIVATE_KEY not configured in server environment' });
    }

    const pdfFile = req.files.pdf;
    const fileSizeBytes = pdfFile.size;
    
    // Check file size limit
    const maxSize = user.fileSizeLimit || (250 * 1024 * 1024); // 250MB
    const currentUsed = user.totalFileSizeUsed || 0;

    if (currentUsed + fileSizeBytes > maxSize) {
      const remainingMB = ((maxSize - currentUsed) / (1024 * 1024)).toFixed(2);
      return res.status(403).json({ 
        error: `File size limit exceeded. You have ${remainingMB} MB remaining out of ${(maxSize / (1024 * 1024))} MB limit.`,
        currentUsed: currentUsed,
        fileSize: fileSizeBytes,
        limit: maxSize,
        remaining: maxSize - currentUsed
      });
    }

    const fileId = crypto.randomUUID();
    const originalFilePath = path.join(tempDir, `${fileId}_original.pdf`);
    const encryptedFilePath = path.join(tempDir, `${fileId}_encrypted.pdf`);

    // Step 1: Save and encrypt the file
    await pdfFile.mv(originalFilePath);
    const encryptionKey = await encryptFile(originalFilePath, encryptedFilePath);
    const parsedEncryptionKey = JSON.parse(encryptionKey);
    fs.unlinkSync(originalFilePath); // Clean up original file

    // Step 2: Get total price for file + metadata
    const filePrice = await getUploadPrice(encryptedFilePath);
    const filePriceBigInt = BigInt(filePrice);

    // Generate metadata to calculate its size
    const tempMetadata = generateMetadata({
      name: name || `Encrypted PDF: ${pdfFile.name}`,
      description: description || 'Encrypted PDF document with secure access',
      arweaveUrl: 'temp', // Temporary, will be updated after upload
      encryptionKey: parsedEncryptionKey,
      originalName: pdfFile.name
    });
    const metadataString = JSON.stringify(tempMetadata);
    const metadataPrice = await bundlr.getPrice(Buffer.byteLength(metadataString));
    const metadataPriceBigInt = BigInt(metadataPrice.toString());
    const totalPrice = filePriceBigInt + metadataPriceBigInt;

    // Step 3: Fund Bundlr if needed
    const bundlrClient = getBundlrWithPrivateKey();
    await bundlrClient.ready();
    const balance = await bundlrClient.getBalance(bundlrClient.address);
    const balanceBigInt = BigInt(balance.toString());

    if (balanceBigInt < totalPrice) {
      const amountNeeded = totalPrice - balanceBigInt;
      console.log(`Funding Bundlr with ${amountNeeded} atomic units...`);
      const fundTx = await bundlrClient.fund(amountNeeded);
      console.log('Bundlr funded successfully:', fundTx);
    } else {
      console.log('Bundlr balance is sufficient.');
    }

    // Step 4: Upload encrypted file to Arweave (PRIMARY - blocking, must complete)
    const fileTags = [
      { name: 'Content-Type', value: pdfFile.mimetype || 'application/octet-stream' }
    ];
    console.log('📤 Uploading encrypted file to Arweave (primary storage)...');
    const fileUploadResult = await uploadFileToArweave(encryptedFilePath, fileTags);
    const arweaveId = fileUploadResult.id;
    const arweaveUrl = fileUploadResult.url;
    console.log('✅ File uploaded to Arweave:', arweaveUrl);

    // Step 4.5: Upload encrypted file to Supabase in BACKGROUND (non-blocking, fallback storage)
    // This happens in parallel and doesn't block the main flow
    let supabaseUrl = null;
    let supabasePath = null;
    let supabasePromise = null;
    
    if (isSupabaseConfigured()) {
      console.log('📤 Starting Supabase upload in background (fallback storage)...');
      const supabaseFileName = `${fileId}_encrypted.pdf`;
      
      // IMPORTANT: Start Supabase upload BEFORE deleting the file
      // Store the promise so we can check on it later
      supabasePromise = uploadFileToSupabase(encryptedFilePath, supabaseFileName)
        .then((supabaseResult) => {
          supabaseUrl = supabaseResult.url;
          supabasePath = supabaseResult.path;
          console.log('✅ File uploaded to Supabase (background):', supabaseUrl);
          return { url: supabaseUrl, path: supabasePath };
        })
        .catch((supabaseError) => {
          console.error('❌ Supabase upload failed:', supabaseError.message);
          console.error('Supabase upload error details:', supabaseError);
          console.warn('⚠️ Background Supabase upload failed (non-critical, Arweave is primary)');
          return null;
        });
      
      // Don't await here - let it run in background
      // We'll check on it later before cleaning up the file
    }

    // Step 5: Generate metadata with Arweave as primary, Supabase as fallback
    // Note: Supabase might still be uploading in background, we'll include it if available
    const metadata = generateMetadata({
      name: name || `Encrypted PDF: ${pdfFile.name}`,
      description: description || 'Encrypted PDF document with secure access',
      arweaveUrl: arweaveUrl, // PRIMARY storage
      supabaseUrl: supabaseUrl || null, // Fallback (might be null if still uploading)
      supabasePath: supabasePath || null, // Fallback path (might be null if still uploading)
      encryptionKey: parsedEncryptionKey,
      originalName: pdfFile.name,
      originalSize: fs.statSync(encryptedFilePath).size
    });
    
    console.log('📤 Uploading metadata to Arweave via Bundlr...');
    const metadataUploadResult = await uploadDataToArweave(metadata, [], false); // Don't wait for confirmation
    const metadataArweaveUrl = metadataUploadResult.url || metadataUploadResult.fallbackUrl;
    console.log(`✅ Metadata uploaded to Arweave. Transaction ID: ${metadataUploadResult.id}. Will be available shortly at: ${metadataArweaveUrl}`);
    
    // Continue Supabase upload in background - it will complete eventually and be available as fallback
    // We don't wait for it since Arweave is the primary storage

    // Step 6: Mint NFT
    const iv = parsedEncryptionKey.iv;
    const encryptionKeyHash = ethers.keccak256(ethers.toUtf8Bytes(parsedEncryptionKey.key));
    const mintResult = await mintNFTDirectly(
      finalRecipientAddress,
      metadataArweaveUrl,
      arweaveId,
      iv,
      encryptionKeyHash
    );

    // Wait for Supabase upload to complete before cleaning up the file
    // This ensures Supabase upload has the file available
    let finalSupabaseUrl = supabaseUrl;
    let finalSupabasePath = supabasePath;
    
    if (supabasePromise) {
      try {
        console.log('⏳ Waiting for Supabase upload to complete before cleanup...');
        // Wait up to 10 seconds for Supabase upload to complete
        const supabaseResult = await Promise.race([
          supabasePromise,
          new Promise((resolve) => setTimeout(() => {
            console.log('⏱️ Supabase upload taking longer than expected, proceeding without waiting...');
            resolve(null);
          }, 10000)) // Wait up to 10 seconds
        ]);
        
        if (supabaseResult) {
          finalSupabaseUrl = supabaseResult.url;
          finalSupabasePath = supabaseResult.path;
          console.log('✅ Supabase upload completed successfully:', finalSupabaseUrl);
          
          // Update metadata with Supabase info now that upload is complete
          metadata.properties.file.fallbackUri = finalSupabaseUrl;
          metadata.properties.file.supabasePath = finalSupabasePath;
          metadata.properties.storage.supabase = finalSupabaseUrl;
          metadata.properties.storage.supabasePath = finalSupabasePath;
        } else {
          console.log('⏳ Supabase upload still in progress (file will remain for background upload)');
          // Continue the upload in background - don't delete file yet
          // Schedule cleanup after a delay to allow upload to complete
          setTimeout(() => {
    if (fs.existsSync(encryptedFilePath)) {
              console.log('🧹 Cleaning up temporary encrypted file after background upload...');
      fs.unlinkSync(encryptedFilePath);
            }
          }, 30000); // Clean up after 30 seconds
        }
      } catch (error) {
        console.error('Supabase upload check error:', error.message);
        console.error('Error details:', error);
      }
    }

    // Store NFT details in database with userId for user account linking
    // Only store if tokenId is available
    if (mintResult.tokenId) {
      try {
        const NFT = (await import('../models/NFT.js')).default;
        const mongoose = (await import('mongoose')).default;
        await NFT.findOneAndUpdate(
          { tokenId: mintResult.tokenId.toString() },
          {
            tokenId: mintResult.tokenId.toString(),
            encryptionKey: JSON.stringify(parsedEncryptionKey), // Store as JSON string
            supabasePath: finalSupabasePath,
            supabaseUrl: finalSupabaseUrl,
            arweaveId: arweaveId,
            arweaveUrl: arweaveUrl,
            recipientAddress: finalRecipientAddress,
            userId: new mongoose.Types.ObjectId(userId), // Link NFT to user account
            originalName: pdfFile.name, // Store original file name
            fileSize: fileSizeBytes // Store original file size in bytes
          },
          { upsert: true, new: true }
        );
        console.log(`✅ Stored NFT details in database for tokenId ${mintResult.tokenId} linked to userId ${userId}`);
        
        // Update user's total file size used
        await User.findByIdAndUpdate(userId, {
          $inc: { totalFileSizeUsed: fileSizeBytes }
        });
        console.log(`✅ Updated user's total file size: ${currentUsed + fileSizeBytes} bytes (${((currentUsed + fileSizeBytes) / (1024 * 1024)).toFixed(2)} MB)`);
      } catch (dbError) {
        console.error('⚠️ Failed to store NFT details in database (non-critical):', dbError.message);
        // Don't fail the entire operation if database storage fails
      }
    } else {
      console.warn('⚠️ TokenId not available - skipping database storage. NFT was minted successfully (tx: ' + mintResult.transactionHash + ') but tokenId could not be extracted.');
      console.warn('⚠️ You can query the contract after a few seconds to get the tokenId and manually store the details if needed.');
    }

    // Clean up encrypted file (only if Supabase upload completed or not configured)
    // If Supabase upload is still in progress, cleanup was scheduled above
    if (!supabasePromise || finalSupabaseUrl) {
      if (fs.existsSync(encryptedFilePath)) {
        console.log('🧹 Cleaning up temporary encrypted file...');
        fs.unlinkSync(encryptedFilePath);
      }
    }

    // Return success result (include metadata for immediate caching on frontend)
    return res.status(200).json({
      success: true,
      fileId,
      encryptionKey,
      arweaveId,
      arweaveUrl, // PRIMARY storage - always available
      supabaseUrl: finalSupabaseUrl, // Fallback storage (might be null if still uploading)
      supabasePath: finalSupabasePath,
      metadataArweaveUrl, // PRIMARY metadata location
      metadata: {
        ...metadata,
        properties: {
          ...metadata.properties,
          file: {
            ...metadata.properties.file,
            uri: arweaveUrl, // PRIMARY URI
            fallbackUri: finalSupabaseUrl, // Fallback URI
            supabasePath: finalSupabasePath
          },
          storage: {
            primary: 'arweave',
            arweave: arweaveUrl,
            supabase: finalSupabaseUrl,
            supabasePath: finalSupabasePath
          }
        }
      },
      transactionHash: mintResult.transactionHash,
      tokenId: mintResult.tokenId,
      recipientAddress: finalRecipientAddress,
      originalName: pdfFile.name,
      note: 'Arweave is primary storage. Supabase is fallback and may still be uploading in background.'
    });

  } catch (error) {
    console.error('Error in automated upload and mint:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process automated upload and mint',
      details: error.stack 
    });
  }
};

/**
 * Get all NFTs owned by the authenticated user (from database, no wallet required)
 */
export const getUserNFTs = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Use shared utility function to get user's NFTs (ensures consistent logic)
    const { getUserNFTsFromDB } = await import('../utils/nftUtils.js');
    const nfts = await getUserNFTsFromDB(userId);
    
    console.log(`[getUserNFTs] Found ${nfts.length} NFTs for userId ${userId}`);

    // Fetch metadata for each NFT
    const nftData = await Promise.all(nfts.map(async (nft) => {
      try {
        // Try to fetch metadata from Arweave
        let metadata = null;
        try {
          // Get tokenURI from contract
          const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');
          const contract = new ethers.Contract(
            contractAddress,
            ['function tokenURI(uint256 tokenId) view returns (string)'],
            provider
          );
          const tokenURI = await contract.tokenURI(nft.tokenId);
          
          // Extract Arweave ID
          let arweaveId = tokenURI;
          if (tokenURI.includes('/')) {
            arweaveId = tokenURI.split('/').pop() || tokenURI;
          }
          arweaveId = arweaveId.split('?')[0].split('#')[0];
          
          // Try to fetch metadata
          const metadataResponse = await fetch(`https://arweave.net/${arweaveId}`, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          if (metadataResponse.ok) {
            metadata = await metadataResponse.json();
          }
        } catch (error) {
          console.warn(`Could not fetch metadata for token ${nft.tokenId}:`, error.message);
        }

        // If metadata fetch failed, construct basic metadata from database
        if (!metadata) {
          try {
            // Use original file name from database if available, otherwise use token ID
            const fileName = nft.originalName || `encrypted_${nft.tokenId}.pdf`;
            const displayName = nft.originalName 
              ? `Encrypted PDF: ${nft.originalName}` 
              : `Encrypted PDF #${nft.tokenId}`;
            
            // Parse encryption key if it exists
            let encryptionDetails = {};
            if (nft.encryptionKey) {
              try {
                const encryptionKey = JSON.parse(nft.encryptionKey);
                encryptionDetails = {
                  algorithm: 'AES-256-CBC',
                  iv: encryptionKey.iv || null
                };
              } catch (parseError) {
                console.warn(`Could not parse encryption key for token ${nft.tokenId}, using minimal metadata`);
                encryptionDetails = {
                  algorithm: 'AES-256-CBC',
                  iv: null
                };
              }
            } else {
              console.warn(`No encryption key found for token ${nft.tokenId}, using minimal metadata`);
              encryptionDetails = {
                algorithm: 'AES-256-CBC',
                iv: null
              };
            }
            
            metadata = {
              name: displayName,
              description: 'Encrypted PDF document with secure access',
              properties: {
                file: {
                  name: fileName,
                  type: 'application/pdf',
                  uri: nft.arweaveUrl || nft.supabaseUrl || '',
                  fallbackUri: nft.supabaseUrl || null
                },
                encryption: encryptionDetails
              }
            };
          } catch (error) {
            console.error(`Error constructing metadata for token ${nft.tokenId}:`, error);
            // Don't return null - still create basic metadata
            const fileName = nft.originalName || `encrypted_${nft.tokenId}.pdf`;
            metadata = {
              name: nft.originalName ? `Encrypted PDF: ${nft.originalName}` : `Encrypted PDF #${nft.tokenId}`,
              description: 'Encrypted PDF document',
              properties: {
                file: {
                  name: fileName,
                  type: 'application/pdf',
                  uri: nft.arweaveUrl || nft.supabaseUrl || '',
                  fallbackUri: nft.supabaseUrl || null
                },
                encryption: {
                  algorithm: 'AES-256-CBC',
                  iv: null
                }
              }
            };
          }
        }
        
        // Always use the original file name from metadata or database for the NFT name
        if (metadata.properties && metadata.properties.file && metadata.properties.file.name) {
          const fileName = metadata.properties.file.name;
          // Update the name to use the actual file name
          if (fileName && fileName !== 'encrypted.pdf' && !fileName.includes('encrypted_')) {
            metadata.name = `Encrypted PDF: ${fileName}`;
          } else if (nft.originalName) {
            // Fallback to database stored name
            metadata.name = `Encrypted PDF: ${nft.originalName}`;
            metadata.properties.file.name = nft.originalName;
          }
        } else if (nft.originalName) {
          // If metadata doesn't have file name, use database stored name
          metadata.name = `Encrypted PDF: ${nft.originalName}`;
          if (!metadata.properties) metadata.properties = {};
          if (!metadata.properties.file) metadata.properties.file = {};
          metadata.properties.file.name = nft.originalName;
        }

        return {
          tokenId: nft.tokenId,
          ...metadata,
          recipientAddress: nft.recipientAddress,
          createdAt: nft.createdAt
        };
      } catch (error) {
        console.error(`Error processing NFT ${nft.tokenId}:`, error);
        return null;
      }
    }));

    // Filter out nulls
    const validNFTs = nftData.filter(nft => nft !== null);

    return res.status(200).json({
      success: true,
      nfts: validNFTs,
      count: validNFTs.length
    });
  } catch (error) {
    console.error('Error in getUserNFTs:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch user NFTs'
    });
  }
};