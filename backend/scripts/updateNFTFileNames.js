import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NFT from '../models/NFT.js';
import { ethers } from 'ethers';
import { contractAddress } from '../utils/wallet.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';
const POLYGON_RPC = process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com';

async function updateNFTFileNames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all NFTs without originalName
    const nftsWithoutName = await NFT.find({
      $or: [
        { originalName: { $exists: false } },
        { originalName: null }
      ]
    }).sort({ createdAt: -1 });

    console.log(`\nFound ${nftsWithoutName.length} NFTs without originalName\n`);

    if (nftsWithoutName.length === 0) {
      console.log('All NFTs have originalName!');
      process.exit(0);
    }

    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(
      contractAddress,
      ['function tokenURI(uint256 tokenId) view returns (string)'],
      provider
    );

    let updated = 0;
    let failed = 0;

    for (const nft of nftsWithoutName) {
      try {
        console.log(`Processing NFT ${nft.tokenId}...`);
        
        // Get tokenURI from contract
        const tokenURI = await contract.tokenURI(nft.tokenId);
        let arweaveId = tokenURI;
        if (tokenURI.includes('/')) {
          arweaveId = tokenURI.split('/').pop() || tokenURI;
        }
        arweaveId = arweaveId.split('?')[0].split('#')[0];

        console.log(`  Arweave ID: ${arweaveId}`);

        // Fetch metadata
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const metadataResponse = await fetch(`https://arweave.net/${arweaveId}`, {
            signal: controller.signal
          });
          
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            
            // Try to extract file name
            let fileName = metadata.properties?.file?.name || 
                          (metadata.attributes?.find((attr) => attr.trait_type === 'Original Filename')?.value) ||
                          null;
            
            if (fileName) {
              await NFT.updateOne(
                { tokenId: nft.tokenId },
                { $set: { originalName: fileName } }
              );
              console.log(`  ✅ Updated with: ${fileName}`);
              updated++;
            } else {
              console.log(`  ⚠️  No file name found in metadata`);
              failed++;
            }
          } else {
            console.log(`  ❌ Failed to fetch metadata: ${metadataResponse.status}`);
            failed++;
          }
        } catch (fetchError) {
          console.log(`  ❌ Error fetching metadata: ${fetchError.message}`);
          failed++;
        } finally {
          clearTimeout(timeoutId);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ❌ Error processing NFT ${nft.tokenId}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateNFTFileNames();

