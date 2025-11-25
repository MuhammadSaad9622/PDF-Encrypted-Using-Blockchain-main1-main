import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'encrypted-pdfs';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not configured. Supabase functionality will be disabled.');
  console.warn('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Upload encrypted file to Supabase Storage
 * @param {string} filePath - Path to the encrypted file
 * @param {string} fileName - Name for the file in Supabase (should include fileId)
 * @returns {Promise<{url: string, path: string, publicUrl: string}>} - Upload result with URLs
 */
export const uploadFileToSupabase = async (filePath, fileName) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  }

  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    
    // Get file stats
    const fileStats = fs.statSync(filePath);
    console.log(`📁 Preparing to upload file to Supabase: ${fileName} (${fileStats.size} bytes)`);
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    if (fileBuffer.length === 0) {
      throw new Error('File is empty, cannot upload');
    }
    
    // Upload to Supabase Storage
    console.log(`📤 Uploading file to Supabase Storage: ${fileName}`);
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .upload(fileName, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: false, // Don't overwrite existing files
        cacheControl: '3600', // Cache for 1 hour
      });

    if (error) {
      console.error('❌ Supabase upload error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        bucket: supabaseBucket,
        fileName: fileName
      });
      
      // Provide more helpful error messages
      if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
        throw new Error(`Supabase bucket '${supabaseBucket}' not found. Please create it in your Supabase dashboard.`);
      } else if (error.message?.includes('JWT') || error.message?.includes('Invalid')) {
        throw new Error(`Supabase authentication error. Please check SUPABASE_SERVICE_ROLE_KEY in your .env file.`);
      } else {
        throw new Error(`Failed to upload to Supabase: ${error.message}`);
      }
    }

    console.log(`✅ File uploaded to Supabase successfully: ${data.path}`);

    // Get public URL (if bucket is public) or signed URL (for private buckets)
    const { data: urlData } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(data.path);

    // Also generate a signed URL for private access (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(supabaseBucket)
      .createSignedUrl(data.path, 31536000); // 1 year expiry

    const publicUrl = urlData?.publicUrl;
    const signedUrl = signedUrlData?.signedUrl || publicUrl;

    return {
      url: signedUrl || publicUrl,
      publicUrl: publicUrl,
      signedUrl: signedUrl,
      path: data.path,
      id: data.id,
      fullPath: data.fullPath
    };
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
};

/**
 * Download file from Supabase Storage
 * @param {string} filePath - Path to the file in Supabase Storage
 * @returns {Promise<Buffer>} - File data as Buffer
 */
export const downloadFileFromSupabase = async (filePath) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    console.log(`📥 Downloading file from Supabase: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .download(filePath);

    if (error) {
      console.error('Supabase download error:', error);
      throw new Error(`Failed to download from Supabase: ${error.message}`);
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ File downloaded from Supabase: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('Error downloading from Supabase:', error);
    throw error;
  }
};

/**
 * Check if file exists in Supabase Storage
 * @param {string} filePath - Path to the file in Supabase Storage
 * @returns {Promise<boolean>} - True if file exists
 */
export const fileExistsInSupabase = async (filePath) => {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .list(filePath.split('/').slice(0, -1).join('/') || '', {
        search: filePath.split('/').pop()
      });

    if (error) {
      console.error('Error checking file existence in Supabase:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking file existence in Supabase:', error);
    return false;
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} filePath - Path to the file in Supabase Storage
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export const deleteFileFromSupabase = async (filePath) => {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from Supabase:', error);
      return false;
    }

    console.log(`✅ File deleted from Supabase: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    return false;
  }
};

/**
 * Get a signed URL for a file (useful for private buckets)
 * @param {string} filePath - Path to the file in Supabase Storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export const getSignedUrlFromSupabase = async (filePath, expiresIn = 3600) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
};

/**
 * Check if Supabase is configured
 * @returns {boolean} - True if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  return supabase !== null && supabaseUrl && supabaseKey;
};

export default supabase;
