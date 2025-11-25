import dotenv from 'dotenv';

dotenv.config();

/**
 * Generates metadata for the NFT
 * @param {Object} params - Metadata parameters
 * @param {string} params.name - NFT name
 * @param {string} params.description - NFT description
 * @param {string} params.arweaveUrl - Arweave URL (primary storage)
 * @param {string} [params.supabaseUrl] - Supabase URL (fallback storage)
 * @param {string} [params.supabasePath] - Supabase storage path (for direct access)
 * @param {Object} params.encryptionKey - Encryption key object
 * @param {string} params.originalName - Original filename
 * @param {number} [params.originalSize] - Original file size
 * @returns {Object} - NFT metadata object
 */
export const generateMetadata = ({ name, description, arweaveUrl, supabaseUrl, supabasePath, encryptionKey, originalName, originalSize }) => {
  return {
    name,
    description,
    image: "https://images.pexels.com/photos/6956183/pexels-photo-6956183.jpeg", // Default secure document image
    external_url: arweaveUrl || supabaseUrl, // Use Arweave as primary, Supabase as fallback
    attributes: [
      {
        trait_type: "Document Type",
        value: "Encrypted PDF"
      },
      {
        trait_type: "Original Filename",
        value: originalName
      },
      {
        display_type: "date",
        trait_type: "Created",
        value: Math.floor(Date.now() / 1000)
      }
    ],
    properties: {
      file: {
        name: originalName,
        type: "application/pdf",
        uri: arweaveUrl || supabaseUrl, // Primary URI (Arweave preferred)
        fallbackUri: supabaseUrl, // Fallback URI (Supabase)
        supabasePath: supabasePath || null, // Supabase storage path for direct download
        size: originalSize
      },
      encryption: encryptionKey, // Store the full encryption key object
      storage: {
        primary: arweaveUrl ? 'arweave' : 'supabase',
        arweave: arweaveUrl || null,
        supabase: supabaseUrl || null,
        supabasePath: supabasePath || null
      }
    }
  };
};