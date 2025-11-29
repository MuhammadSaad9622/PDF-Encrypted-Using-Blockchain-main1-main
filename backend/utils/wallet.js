import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get contract address from file
export let contractAddress; // Export the contractAddress variable
try {
  const contractAddressFile = path.join(__dirname, '../contractAddress.json');
  if (fs.existsSync(contractAddressFile)) {
    const contractData = JSON.parse(fs.readFileSync(contractAddressFile, 'utf8'));
    contractAddress = contractData.address;
  } else {
      console.error('Error: contractAddress.json not found. Please ensure the contract address is set up.');
      // Optionally, you might want to exit or prevent the server from starting without the address
  }
} catch (error) {
  console.error('Error reading contract address from file:', error);
}

// Initialize provider
const provider = new ethers.JsonRpcProvider(
  process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
);

// Get contract ABI from file
const getContractABI = () => {
  try {
    const artifactPath = path.join(__dirname, '../PdfNFT.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    console.log('ABI file path is:', artifactPath);
    // Return the inner ABI array
    if (Array.isArray(artifact.abi) && Array.isArray(artifact.abi[0])) {
        console.log('Returning nested ABI array');
        return artifact.abi[0];
    } else if (Array.isArray(artifact.abi)) {
        console.log('Returning flat ABI array');
        return artifact.abi;
    } else {
        throw new Error('Invalid ABI format in PdfNFT.json');
    }
  } catch (error) {
    console.error('Error reading contract ABI:', error);
    throw new Error('Contract ABI not found or invalid format. Make sure the file is in the correct location and format.');
  }
};

/**
 * Prepares the transaction data for minting an NFT with the given metadata URI, Arweave ID, IV, and encryption key hash
 * @param {string} recipientAddress - Address to mint the NFT to
 * @param {string} metadataUri - URI of the metadata on Arweave
 * @param {string} arweaveId - Arweave transaction ID of the encrypted PDF
 * @param {string} iv - Initialization Vector used for encryption
 * @param {bytes32} encryptionKeyHash - Hash of the encryption key
 * @returns {Promise<object>} - Transaction request object
 */
export const mintNFTWithMetadata = async (
  recipientAddress,
  metadataUri,
  arweaveId,
  iv,
  encryptionKeyHash
) => {
  try {
    if (!contractAddress) {
      throw new Error('Contract address not found. Deploy the contract first.');
    }

    const abi = getContractABI();
    // Initialize contract instance with provider only, no signer needed for preparing tx
    const contract = new ethers.Contract(contractAddress, abi, provider);

    console.log('Preparing mint transaction data with:', {
      to: recipientAddress,
      tokenURI: metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash: encryptionKeyHash // Pass as bytes32
    });

    // Encode the transaction data
    const data = contract.interface.encodeFunctionData("mint", [
      recipientAddress,
      metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash
    ]);

    // Prepare the transaction request object
    const transactionRequest = {
      to: contractAddress,
      data: data,
      // Add gas price, gas limit, nonce if needed (can often be estimated on frontend)
      // value: ethers.parseEther("0.00"), // Example for sending ETH
    };

    console.log('Prepared transaction request:', transactionRequest);

    // Return the transaction request object for the frontend to sign and send
    return transactionRequest;
  } catch (error) {
    console.error('Error preparing mint transaction:', error);
    throw error;
  }
};

/**
 * Mints an NFT directly using private key from environment
 * @param {string} recipientAddress - Address to mint the NFT to
 * @param {string} metadataUri - URI of the metadata on Arweave
 * @param {string} arweaveId - Arweave transaction ID of the encrypted PDF
 * @param {string} iv - Initialization Vector used for encryption
 * @param {bytes32} encryptionKeyHash - Hash of the encryption key
 * @returns {Promise<object>} - Transaction receipt with tokenId
 */
/**
 * Get the backend wallet address from private key
 * @returns {string} - Backend wallet address
 */
export const getBackendWalletAddress = () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in environment variables');
  }
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  return wallet.address;
};

export const mintNFTDirectly = async (
  recipientAddress,
  metadataUri,
  arweaveId,
  iv,
  encryptionKeyHash
) => {
  try {
    if (!contractAddress) {
      throw new Error('Contract address not found. Deploy the contract first.');
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }

    const abi = getContractABI();
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, abi, signer);

    console.log('Minting NFT directly with:', {
      to: recipientAddress,
      tokenURI: metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash
    });

    // Estimate gas
    const gasEstimate = await contract.mint.estimateGas(
      recipientAddress,
      metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash
    );

    // Send transaction
    const tx = await contract.mint(
      recipientAddress,
      metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash,
      { gasLimit: gasEstimate }
    );

    console.log('Mint transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Mint transaction confirmed:', receipt);

    // Extract tokenId from transaction receipt
    // Try multiple methods to get the tokenId
    let tokenId = null;
    
    // Method 1: Try to decode Transfer event from logs
    if (receipt.logs && receipt.logs.length > 0) {
      // Try all logs, not just the last one
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'Transfer') {
            // Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
            tokenId = parsedLog.args.tokenId?.toString();
            if (tokenId) {
              console.log(`✅ Found tokenId ${tokenId} from Transfer event`);
              break;
            }
          }
        } catch (e) {
          // Continue to next log if parsing fails
          continue;
        }
      }
    }
    
    // Method 2: If tokenId not found, try using totalSupply (assuming sequential tokenIds)
    if (!tokenId) {
      try {
        const totalSupply = await contract.totalSupply();
        tokenId = (totalSupply - 1n).toString(); // Last minted token is totalSupply - 1
        console.log(`✅ Found tokenId ${tokenId} using totalSupply method`);
      } catch (e) {
        console.warn('⚠️ Could not get tokenId from totalSupply:', e.message);
      }
    }
    
    // Method 3: Try to find tokenId by checking owner's latest token
    if (!tokenId) {
      try {
        const balance = await contract.balanceOf(recipientAddress);
        if (balance > 0n) {
          // Get the last token owned by the recipient (index = balance - 1)
          tokenId = await contract.tokenOfOwnerByIndex(recipientAddress, balance - 1n);
          tokenId = tokenId.toString();
          console.log(`✅ Found tokenId ${tokenId} from owner's token index`);
        }
      } catch (e) {
        console.warn('⚠️ Could not get tokenId from owner tokens:', e.message);
      }
    }

    if (!tokenId) {
      console.warn('⚠️ Could not extract tokenId from mint transaction. The NFT was minted successfully but tokenId could not be determined.');
    }

    return {
      transactionHash: receipt.hash,
      tokenId: tokenId,
      receipt: receipt
    };
  } catch (error) {
    console.error('Error minting NFT directly:', error);
    throw error;
  }
};