import Bundlr from '@bundlr-network/client';
import fs from 'fs';
import dotenv from 'dotenv';
import { ethers } from 'ethers'; // Import ethers

dotenv.config();

const bundlrNode = process.env.BUNDLR_NODE || 'https://node1.bundlr.network';
const bundlrCurrency = process.env.BUNDLR_CURRENCY || 'matic';
const polygonRpcUrl = process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com';

// Initialize Bundlr client (This will now be done on the frontend using the connected wallet)
// The backend will no longer initialize Bundlr with a private key.
// The functions below will be modified or used by the frontend.

// Removed Bundlr client initialization with private key
// const bundlr = new Bundlr(
//   bundlrNode,
//   bundlrCurrency,
//   process.env.PRIVATE_KEY, // Use private key from env
//   {
//     providerUrl: polygonRpcUrl
//   }
// );

// Re-initialize bundlr as a placeholder or if certain methods are still needed without a signer
// This might need adjustment based on how getUploadPrice and getBundlrAddress are used
// If getUploadPrice requires a connected wallet, it might also need to move to frontend
export const bundlr = new Bundlr(
  bundlrNode,
  bundlrCurrency,
    undefined, // Initialize without a private key or signer in the backend
    { providerUrl: polygonRpcUrl } // Pass options as the fourth argument
);

console.log('Bundlr client placeholder initialized.'); // Log after placeholder init

/**
 * Initialize Bundlr client with private key from environment
 * Used for automated operations that require funding and uploading
 */
export const getBundlrWithPrivateKey = () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in environment variables');
  }
  
  return new Bundlr(
    bundlrNode,
    bundlrCurrency,
    process.env.PRIVATE_KEY,
    { providerUrl: polygonRpcUrl }
  );
};

/**
 * Upload file to Arweave using Bundlr with private key
 * Optimized to use faster gateways
 */
export const uploadFileToArweave = async (filePath, tags = []) => {
  const bundlr = getBundlrWithPrivateKey();
  await bundlr.ready();
  
  const fileData = fs.readFileSync(filePath);
  const defaultTags = [
    { name: 'Content-Type', value: 'application/octet-stream' },
    { name: 'App-Name', value: 'EncryptedPDF-DApp' },
    ...tags
  ];
  
  console.log('📤 Uploading encrypted file to Arweave via Bundlr...');
  const startTime = Date.now();
  const response = await bundlr.upload(fileData, { tags: defaultTags });
  const uploadTime = Date.now() - startTime;
  console.log(`✅ File uploaded to Bundlr in ${uploadTime}ms. Transaction ID: ${response.id}`);
  
  // Use arweave.net as PRIMARY gateway
  return {
    id: response.id,
    url: `https://arweave.net/${response.id}` // PRIMARY gateway
  };
};

/**
 * Check if Arweave transaction is available on multiple gateways
 */
export const checkArweaveAvailability = async (transactionId, maxRetries = 30, delayMs = 2000) => {
  const gateways = [
    `https://arweave.net/${transactionId}` // PRIMARY gateway
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const gatewayUrl of gateways) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per check

        const response = await fetch(gatewayUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, text/plain, */*',
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Metadata available on ${gatewayUrl} after ${attempt + 1} attempts`);
          return { available: true, gateway: gatewayUrl, attempts: attempt + 1 };
        }
      } catch (error) {
        // Continue to next gateway
        continue;
      }
    }

    if (attempt < maxRetries - 1) {
      console.log(`⏳ Waiting for metadata propagation... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { available: false, attempts: maxRetries };
};

/**
 * Upload data (string/buffer) to Arweave using Bundlr with private key
 * Now includes confirmation waiting and availability checking
 */
export const uploadDataToArweave = async (data, tags = [], waitForConfirmation = true) => {
  const bundlr = getBundlrWithPrivateKey();
  await bundlr.ready();
  
  const defaultTags = [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'App-Name', value: 'EncryptedPDF-DApp' },
    ...tags
  ];
  
  const dataToUpload = typeof data === 'string' ? data : JSON.stringify(data);
  console.log('📤 Uploading metadata to Arweave via Bundlr...');
  const startTime = Date.now();
  
  const response = await bundlr.upload(dataToUpload, { tags: defaultTags });
  const uploadTime = Date.now() - startTime;
  console.log(`✅ Metadata uploaded to Bundlr in ${uploadTime}ms. Transaction ID: ${response.id}`);
  
  // Use arweave.net as PRIMARY gateway
  const primaryUrl = `https://arweave.net/${response.id}`;
  
  // If waitForConfirmation is true, wait for availability
  if (waitForConfirmation) {
    console.log('⏳ Waiting for metadata to be available on Arweave gateway...');
    const availabilityCheck = await checkArweaveAvailability(response.id, 15, 2000); // Check for up to 30 seconds
    
    if (availabilityCheck.available) {
      console.log(`✅ Metadata confirmed available after ${availabilityCheck.attempts} checks`);
      return {
        id: response.id,
        url: primaryUrl,
        confirmed: true,
        availableAt: availabilityCheck.gateway
      };
    } else {
      console.warn('⚠️ Metadata uploaded but not yet confirmed on gateway. It will be available shortly.');
      // Still return the URL - it will be available soon
      return {
        id: response.id,
        url: primaryUrl,
        confirmed: false,
        note: 'Metadata is being processed and will be available shortly'
      };
    }
  }
  
  return {
    id: response.id,
    url: primaryUrl,
    confirmed: false
  };
};

/**
 * Calculates the price for uploading a file to Arweave via Bundlr
 * This can still be calculated on the backend.
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<string>} - Price in atomic units (as a string)
 */
export const getUploadPrice = async (filePath) => {
  try {
    const price = await bundlr.getPrice(fs.statSync(filePath).size);
    console.log(`Calculated upload cost: ${bundlr.utils.unitConverter(price).toString()} ${bundlrCurrency}`);
    return price.toString(); // Return price as string
  } catch (error) {
    console.error('Error calculating upload price:', error);
    throw error;
  }
};

/**
 * Uploads a pre-funded file to Arweave via Bundlr
 * This function is no longer used on the backend as upload will happen on the frontend.
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<{id: string, url: string}>} - Arweave transaction ID and URL
 */
// Removed the uploadPreFundedFile function
// export const uploadPreFundedFile = async (filePath) => {
//   try {
//     // Check for sufficient funds (optional here, but good practice)
//     const price = await bundlr.getPrice(fs.statSync(filePath).size);
//     const balance = await bundlr.getLoadedBalance();

//     if (balance.isLessThan(price)) {
//       console.error('Error: Insufficient Bundlr balance for upload after funding.');
//       throw new Error('Insufficient Bundlr balance. Please ensure Bundlr was funded correctly.');
//     }

//     // Upload the file
//     const fileData = fs.readFileSync(filePath);
//     const tags = [{ name: 'Content-Type', value: 'application/pdf' }];
//     const response = await bundlr.upload(fileData, { tags });

//     return {
//       id: response.id,
//       url: `https://arweave.net/${response.id}`
//     };
//   } catch (error) {
//     console.error('Error uploading to Arweave:', error);
//     throw error;
//   }
// };

// Add function to get Bundlr address to send funds to
export const getBundlrAddress = () => {
    console.log('Getting Bundlr address:', bundlr.address); // Log address when function is called
    return bundlr.address;
};