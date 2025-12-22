/**
 * NFT Metadata Cache Utility
 * Stores and retrieves NFT metadata from localStorage for efficient access
 */

const CACHE_PREFIX = 'nft_metadata_';
const CACHE_TIMESTAMP_PREFIX = 'nft_metadata_timestamp_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  properties: {
    file: {
      name: string;
      type: string;
      size: number;
      uri: string;
    };
    encryption: {
      key: string;
      iv: string;
      algorithm?: string;
    };
  };
  [key: string]: any;
}

/**
 * Get cached metadata for a token ID
 */
export const getCachedMetadata = (tokenId: string): NFTMetadata | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${tokenId}`);
    const timestamp = localStorage.getItem(`${CACHE_TIMESTAMP_PREFIX}${tokenId}`);
    
    if (!cached || !timestamp) {
      return null;
    }

    // Check if cache is expired
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (now - cacheTime > CACHE_EXPIRY_MS) {
      // Cache expired, remove it
      removeCachedMetadata(tokenId);
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached metadata:', error);
    return null;
  }
};

/**
 * Cache metadata for a token ID
 */
export const cacheMetadata = (tokenId: string, metadata: NFTMetadata): void => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${tokenId}`, JSON.stringify(metadata));
    localStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${tokenId}`, Date.now().toString());
  } catch (error) {
    console.error('Error caching metadata:', error);
    // If storage is full, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearExpiredCache();
      // Try again
      try {
        localStorage.setItem(`${CACHE_PREFIX}${tokenId}`, JSON.stringify(metadata));
        localStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${tokenId}`, Date.now().toString());
      } catch (retryError) {
        console.error('Failed to cache metadata after cleanup:', retryError);
      }
    }
  }
};

/**
 * Remove cached metadata for a token ID
 */
export const removeCachedMetadata = (tokenId: string): void => {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${tokenId}`);
    localStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${tokenId}`);
  } catch (error) {
    console.error('Error removing cached metadata:', error);
  }
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
        const timestamp = parseInt(localStorage.getItem(key) || '0', 10);
        if (now - timestamp > CACHE_EXPIRY_MS) {
          const tokenId = key.replace(CACHE_TIMESTAMP_PREFIX, '');
          keysToRemove.push(tokenId);
        }
      }
    }

    // Remove expired entries
    keysToRemove.forEach(tokenId => {
      removeCachedMetadata(tokenId);
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};

/**
 * Clear all NFT metadata cache
 */
export const clearAllCache = (): void => {
  try {
    const keysToRemove: string[] = [];

    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_TIMESTAMP_PREFIX))) {
        keysToRemove.push(key);
      }
    }

    // Remove all cache entries
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`Cleared all NFT metadata cache (${keysToRemove.length} entries)`);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

/**
 * Fetch metadata from URL and cache it
 * Uses multiple Arweave gateways for better reliability and speed
 */
export const fetchAndCacheMetadata = async (
  tokenId: string,
  metadataUrl: string
): Promise<NFTMetadata> => {
  // Extract Arweave transaction ID from URL
  let arweaveId = metadataUrl;
  if (metadataUrl.includes('/')) {
    arweaveId = metadataUrl.split('/').pop() || metadataUrl;
  }
  
  // Try only primary gateway (arweave.net)
  const gateways = [
    `https://arweave.net/${arweaveId}` // PRIMARY gateway
  ];

  let lastError: Error | null = null;

  for (const gatewayUrl of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(gatewayUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const metadata = await response.json();
        cacheMetadata(tokenId, metadata);
        console.log(`✅ Metadata fetched from ${gatewayUrl}`);
        return metadata;
      } else if (response.status === 404) {
        // Continue to next gateway
        continue;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      lastError = error;
      // Continue to next gateway
      continue;
    }
  }

  // If all gateways failed, provide helpful error message
  if (lastError) {
    console.error('Error fetching metadata from all gateways:', lastError);
    throw new Error(`Metadata not found on Arweave. The metadata may still be propagating. Token ID: ${tokenId}. If you just minted this NFT, please wait a moment and try again.`);
  }

  throw new Error(`Failed to fetch metadata from all Arweave gateways for token ${tokenId}`);
};

