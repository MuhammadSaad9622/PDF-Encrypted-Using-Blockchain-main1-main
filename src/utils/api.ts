// Import NFT cache utilities
import { getCachedMetadata, cacheMetadata, fetchAndCacheMetadata } from './nftCache';

// API utility with support for both development and production URLs
const getApiUrl = () => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  const productionUrl = 'https://doc-and-key-early-access.onrender.com';
  const developmentUrl = 'http://localhost:5000';
  
  return isDevelopment ? developmentUrl : productionUrl;
};

export const API_BASE_URL = getApiUrl();

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Use admin token if available, otherwise use regular token
  const authToken = adminToken || token;
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An error occurred' }));
    // Create an error object that preserves all error details
    const apiError: any = new Error(errorData.error || errorData.message || 'API request failed');
    // Attach additional error details for structured error handling
    apiError.errorCode = errorData.errorCode;
    apiError.errorCategory = errorData.errorCategory;
    apiError.errors = errorData.errors;
    apiError.success = errorData.success;
    apiError.details = errorData.details;
    // Preserve the original error message in error property
    apiError.error = errorData.error || errorData.message;
    throw apiError;
  }
  
  return response.json();
};

// Auth API calls
export const authApi = {
  signup: async (signupData: {
    email: string;
    password: string;
    name: string;
    accessCode: string;
    referralCode?: string;
    phone: string;
    address: string;
    city: string;
    state?: string;
    province?: string;
    country: string;
    zipCode: string;
    agreedToTerms: boolean;
    agreedToPrivacy: boolean;
    agreedToEarlyAdopter: boolean;
  }) => {
    return apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupData),
    });
  },

  validateAccessCode: async (code: string) => {
    return apiCall('/api/auth/validate-access-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  validateReferralCode: async (code: string) => {
    return apiCall('/api/auth/validate-referral-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  getReferralStats: async () => {
    return apiCall('/api/auth/referral/stats');
  },

  getReferralHistory: async (page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/api/auth/referral/history?${params}`);
  },
  
  signin: async (email: string, password: string) => {
    return apiCall('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  getCurrentUser: async () => {
    return apiCall('/api/auth/me');
  },
  
  updateWalletAddress: async (walletAddress: string) => {
    return apiCall('/api/auth/wallet', {
      method: 'PUT',
      body: JSON.stringify({ walletAddress }),
    });
  },
  
  updateProfile: async (profileData: {
    name?: string;
    email?: string;
    profilePhoto?: string;
    bio?: string;
    phone?: string;
    location?: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
    website?: string;
    company?: string;
    jobTitle?: string;
  }) => {
    return apiCall('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  getUserInvoices: async (page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/api/auth/invoices?${params}`);
  },

  getUserNotes: async () => {
    return apiCall('/api/auth/notes');
  },

  markNotesAsRead: async () => {
    return apiCall('/api/auth/notes/mark-read', {
      method: 'POST',
    });
  },
};

// PDF API calls
export const pdfApi = {
  encryptUpload: async (formData: FormData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/encrypt-upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },
  
  getTotalArweavePrice: async (data: any) => {
    return apiCall('/api/total-arweave-price', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getEncryptedFile: async (fileId: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/encrypted-file/${fileId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch encrypted file');
    }
    
    return response.blob();
  },
  
  generateMetadata: async (data: any) => {
    return apiCall('/api/generate-metadata', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  mintNft: async (data: any) => {
    return apiCall('/api/mint-nft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getNftMetadata: async (tokenId: string, metadataUrl?: string) => {
    // First, check cache
    const cached = getCachedMetadata(tokenId);
    if (cached) {
      console.log(`Using cached metadata for token ${tokenId}`);
      return cached;
    }

    // If metadataUrl is provided, try fetching directly from Arweave first (faster)
    if (metadataUrl) {
      try {
        console.log(`Fetching metadata directly from Arweave for token ${tokenId}`);
        const metadata = await fetchAndCacheMetadata(tokenId, metadataUrl);
        return metadata;
      } catch (error: any) {
        // If Arweave returns 404, check cache again (might have been cached after our initial check)
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
          console.warn('Arweave returned 404, checking cache again...');
          const cachedAfter404 = getCachedMetadata(tokenId);
          if (cachedAfter404) {
            console.log(`Found cached metadata after Arweave 404 for token ${tokenId}`);
            return cachedAfter404;
          }
          console.warn('Direct Arweave fetch failed with 404 and no cache available, trying backend:', error);
        } else {
          console.warn('Direct Arweave fetch failed, trying backend:', error);
        }
        // Fall through to backend fetch
      }
    }

    // Fallback to backend API
    console.log(`Fetching metadata via backend for token ${tokenId}`);
    const response = await fetch(`${API_BASE_URL}/api/nft-metadata/${tokenId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch NFT metadata' }));
      
      // If 404, metadata is not yet on Arweave - check if we have it cached
      if (response.status === 404) {
        const cached = getCachedMetadata(tokenId);
        if (cached) {
          console.log(`Arweave returned 404, but found cached metadata for token ${tokenId}`);
          return cached;
        }
        // If no cache, throw helpful error
        throw new Error(errorData.message || 'Metadata is still propagating on Arweave. If you just minted this NFT, please wait a few moments and try again.');
      }
      
      throw new Error(errorData.error || errorData.message || 'Failed to fetch NFT metadata');
    }
    const metadata = await response.json();
    
    // Cache the metadata for future use
    cacheMetadata(tokenId, metadata);
    
    return metadata;
  },
  
  decryptFile: async (tokenId: string, walletAddress?: string, onProgress?: (progress: number, status: string) => void) => {
    const token = localStorage.getItem('token');
    
    // Use XMLHttpRequest for progress tracking
    return new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastProgressUpdate = 0;
      
      // Track download progress with throttling for smooth updates
      xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const now = Date.now();
          // Update progress at least every 100ms for smooth animation
          if (now - lastProgressUpdate > 100 || event.loaded === event.total) {
            const downloadPercent = (event.loaded / event.total) * 100;
            // Map download progress: 10-85% for download phase
            const mappedProgress = Math.min(85, 10 + (downloadPercent * 0.75));
            const status = `Downloading encrypted file... ${downloadPercent.toFixed(1)}% (${(event.loaded / 1024 / 1024).toFixed(2)} MB / ${(event.total / 1024 / 1024).toFixed(2)} MB)`;
            onProgress(mappedProgress, status);
            lastProgressUpdate = now;
          }
        } else if (onProgress && event.loaded > 0) {
          // If length not computable, estimate progress based on loaded bytes
          const estimatedProgress = Math.min(85, 10 + (event.loaded / (1024 * 1024)) * 2); // Rough estimate
          const status = `Downloading encrypted file... ${(event.loaded / 1024 / 1024).toFixed(2)} MB`;
          onProgress(estimatedProgress, status);
        }
      });
      
      // Track upload progress (request sending)
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const uploadPercent = (event.loaded / event.total) * 100;
          const progress = Math.min(10, 5 + (uploadPercent * 0.05));
          onProgress(progress, 'Sending request...');
        }
      });
      
      xhr.addEventListener('loadstart', () => {
        if (onProgress) {
          onProgress(5, 'Initializing download...');
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) {
            onProgress(85, 'Download complete, decrypting...');
          }
          
          // Simulate decryption progress
          setTimeout(() => {
            if (onProgress) {
              onProgress(90, 'Decrypting PDF...');
            }
            setTimeout(() => {
              if (onProgress) {
                onProgress(95, 'Finalizing...');
              }
              setTimeout(() => {
                if (onProgress) {
                  onProgress(100, 'Complete!');
                }
                resolve(xhr.response as Blob);
              }, 150);
            }, 150);
          }, 200);
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Decryption failed'));
          } catch {
            reject(new Error('Decryption failed'));
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during decryption'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Decryption aborted'));
      });
      
      xhr.open('POST', `${API_BASE_URL}/api/decrypt/${tokenId}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.responseType = 'blob';
      
      // Send walletAddress only if provided (for backward compatibility)
      const requestBody = walletAddress ? JSON.stringify({ walletAddress }) : JSON.stringify({});
      xhr.send(requestBody);
    });
  },

  getUserNFTs: async () => {
    return apiCall('/api/user-nfts');
  },

  automatedUploadAndMint: async (formData: FormData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/automated-upload-mint`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      // Preserve the full error message and status code
      const errorMessage = error.error || 'Upload failed';
      const apiError: any = new Error(errorMessage);
      apiError.status = response.status;
      apiError.requiresSubscription = error.requiresSubscription;
      apiError.currentStatus = error.currentStatus;
      throw apiError;
    }
    
    return response.json();
  },
};

// Stats API calls
export const statsApi = {
  getUserStats: async () => {
    // Fetch stats from backend database (requires authentication)
    return apiCall('/api/stats/user-stats');
  },
};

// Admin API calls
export const adminApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  getDashboardStats: async () => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch stats' }));
      throw new Error(error.error || 'Failed to fetch stats');
    }

    return response.json();
  },

  getAnalytics: async () => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch analytics' }));
      throw new Error(error.error || 'Failed to fetch analytics');
    }

    return response.json();
  },

  getAllUsers: async (page: number = 1, limit: number = 10, search: string = '') => {
    const token = localStorage.getItem('adminToken');
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });

    const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
      throw new Error(error.error || 'Failed to fetch users');
    }

    return response.json();
  },

  getUserById: async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  updateUser: async (userId: string, data: any) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  deleteUser: async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  suspendUser: async (userId: string, reason?: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
  },

  unsuspendUser: async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  updateUserNotes: async (userId: string, adminNotes: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}/notes`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ adminNotes }),
    });
  },

  getUserNFTDetails: async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/nfts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch user NFT details' }));
      throw new Error(error.error || 'Failed to fetch user NFT details');
    }

    return response.json();
  },

  getBillingInvoices: async (page: number = 1, limit: number = 20) => {
    const token = localStorage.getItem('adminToken');
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/api/admin/billing/invoices?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch invoices' }));
      throw new Error(error.error || 'Failed to fetch invoices');
    }

    return response.json();
  },

  cancelUserSubscription: async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}/subscription/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Access code management
  createAccessCode: async (data: {
    code: string;
    maxUses?: number;
    expiresAt?: string;
    description?: string;
  }) => {
    const token = localStorage.getItem('adminToken');
    return apiCall('/api/admin/access-codes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  getAccessCodes: async (page: number = 1, limit: number = 20, isActive?: boolean) => {
    const token = localStorage.getItem('adminToken');
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(isActive !== undefined && { isActive: isActive.toString() }),
    });
    const response = await fetch(`${API_BASE_URL}/api/admin/access-codes?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch access codes' }));
      throw new Error(error.error || 'Failed to fetch access codes');
    }
    return response.json();
  },

  updateAccessCode: async (id: string, data: {
    isActive?: boolean;
    maxUses?: number;
    expiresAt?: string;
    description?: string;
    subscriptionPlan?: string;
    subscriptionDuration?: number;
  }) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/access-codes/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  deleteAccessCode: async (id: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/access-codes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Admin settings
  changeAdminPassword: async (currentPassword: string, newPassword: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  promoteUserToAdmin: async (userId: string) => {
    const token = localStorage.getItem('adminToken');
    return apiCall(`/api/admin/users/${userId}/promote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Payment API calls
export const paymentApi = {
  createSubscriptionPayment: async () => {
    return apiCall('/api/payments/stripe/create-subscription', {
      method: 'POST',
    });
  },

  processSubscriptionPayment: async (data: {
    paymentIntentId: string;
    paymentMethodId: string;
    invoiceId: string;
  }) => {
    return apiCall('/api/payments/stripe/process-subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSubscriptionStatus: async () => {
    return apiCall('/api/payments/subscription/status');
  },

  cancelSubscription: async () => {
    return apiCall('/api/payments/subscription/cancel', {
      method: 'POST',
    });
  },

  getStripeConfig: async () => {
    return apiCall('/api/payments/stripe/config');
  },

  verifyCard: async (paymentMethodId: string) => {
    return apiCall('/api/payments/stripe/verify-card', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    });
  },
};

