# Supabase Integration Summary

## Overview

Supabase has been successfully integrated into the PDF encryption platform as a temporary storage and fallback mechanism. Files are now stored on both Arweave (primary, permanent storage) and Supabase (temporary, fast access fallback).

## Changes Made

### 1. New Files Created

- **`backend/utils/supabase.js`**: Complete Supabase utility module with functions for:
  - Uploading files to Supabase Storage
  - Downloading files from Supabase Storage
  - Checking file existence
  - Deleting files
  - Generating signed URLs

### 2. Modified Files

#### `backend/controllers/pdfController.js`
- **`encryptAndUpload`**: Now uploads encrypted files to Supabase immediately after encryption
- **`generateMetadataJson`**: Updated to accept and include Supabase URL in metadata
- **`automatedUploadAndMint`**: Uploads to both Arweave and Supabase, includes both URLs in metadata
- **`decryptFile`**: Enhanced with fallback logic:
  1. Tries Arweave first (primary storage)
  2. Falls back to Supabase if Arweave fails or is unavailable

#### `backend/utils/generateMetadata.js`
- Updated to include Supabase URL and path in NFT metadata
- Metadata now contains:
  - `properties.file.uri`: Primary URI (Arweave)
  - `properties.file.fallbackUri`: Fallback URI (Supabase)
  - `properties.file.supabasePath`: Direct Supabase storage path
  - `properties.storage`: Object containing all storage information

### 3. Dependencies

- Added `@supabase/supabase-js` to `backend/package.json`

### 4. Documentation

- **`SUPABASE_SETUP.md`**: Complete setup guide for Supabase integration
- **`README.md`**: Updated with Supabase configuration information

## How It Works

### Upload Flow

1. **Encrypt PDF** → File encrypted with AES-256-CBC
2. **Upload to Supabase** (if configured) → Encrypted file stored temporarily
3. **Upload to Arweave** → Encrypted file stored permanently on decentralized storage
4. **Generate Metadata** → Includes both Arweave and Supabase URLs
5. **Mint NFT** → NFT metadata contains references to both storage locations

### Download/Decrypt Flow

1. **Verify Ownership** → Check if user owns the NFT
2. **Fetch Metadata** → Get metadata from Arweave
3. **Try Arweave First** → Attempt download from Arweave gateways
   - Multiple gateways tried: ar-io.net, arweave.net, arweave.live
   - Retry logic with exponential backoff
4. **Fallback to Supabase** → If Arweave fails:
   - Extract Supabase path from metadata
   - Download directly from Supabase Storage
   - Convert to same format as Arweave (hex string)
5. **Decrypt & Serve** → Decrypt file and serve to user

## Benefits

1. **Faster Access**: Supabase provides faster download speeds compared to Arweave
2. **Reliability**: Fallback mechanism ensures files are always accessible
3. **Graceful Degradation**: Works without Supabase (Arweave-only mode)
4. **Immediate Availability**: Files available immediately after upload (Supabase) while Arweave propagates

## Configuration

Supabase is **optional**. If not configured:
- System will only use Arweave
- No errors will occur
- System will log warnings that Supabase is not configured

### Required Environment Variables

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=encrypted-pdfs
```

See `SUPABASE_SETUP.md` for detailed setup instructions.

## Storage Strategy

- **Primary Storage**: Arweave (decentralized, permanent)
- **Temporary/Fallback Storage**: Supabase (centralized, fast, optional)
- **Metadata Storage**: Arweave (always on Arweave for NFT metadata)

## Error Handling

- Supabase upload failures don't stop the process (continues with Arweave only)
- Supabase download failures fall back to retrying Arweave
- Clear error messages for debugging
- Graceful handling of missing Supabase configuration

## Testing

To test the integration:

1. Configure Supabase (see `SUPABASE_SETUP.md`)
2. Upload a PDF file
3. Check backend logs for Supabase upload confirmation
4. View the NFT metadata - should contain both Arweave and Supabase URLs
5. Disconnect from Arweave temporarily and try to view/decrypt - should use Supabase fallback

## Future Enhancements

Potential improvements:
- Automatic cleanup of Supabase files after Arweave confirmation
- Batch upload/download operations
- Storage analytics and monitoring
- Configurable storage preferences

## Notes

- Supabase storage is temporary - files should primarily be on Arweave
- Supabase free tier provides 1GB storage and 2GB bandwidth
- Service role key has admin privileges - keep it secure
- Files remain encrypted in both storage locations
