# Supabase Setup Guide

This application uses Supabase for temporary file storage as a fallback when Arweave is not immediately available.

## Why Supabase?

- **Temporary Storage**: Files are stored in Supabase immediately after encryption for fast access
- **Fallback Mechanism**: If Arweave is slow or unavailable, files can be fetched from Supabase
- **Primary Storage**: Arweave remains the primary storage (decentralized and permanent)
- **Best of Both Worlds**: Fast temporary access (Supabase) + Permanent decentralized storage (Arweave)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be fully provisioned

### 2. Create a Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Create a bucket named `encrypted-pdfs` (or your preferred name)
4. **Bucket Settings**:
   - **Public bucket**: Choose based on your needs
     - **Public**: Anyone with the URL can access files (faster, less secure)
     - **Private**: Requires signed URLs (more secure, slightly slower)
   - **File size limit**: Set appropriate limit (e.g., 50MB)
   - **Allowed MIME types**: `application/octet-stream` or leave empty for all types

### 3. Get Your Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **Service Role Key** (under "Project API keys" → "service_role" key)
     - ⚠️ **Important**: Never expose this key in frontend code. It has admin privileges.

### 4. Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_STORAGE_BUCKET=encrypted-pdfs
```

**Note**: If you named your bucket differently, update `SUPABASE_STORAGE_BUCKET` accordingly.

### 5. Verify Setup

After configuring, the application will:
- Automatically upload encrypted files to Supabase during encryption
- Include Supabase URL in NFT metadata as a fallback
- Try Arweave first when decrypting/viewing PDFs
- Fallback to Supabase if Arweave is unavailable

## How It Works

### Upload Flow

1. **Encrypt PDF** → File is encrypted with AES-256-CBC
2. **Upload to Supabase** → Encrypted file uploaded to Supabase (temporary storage)
3. **Upload to Arweave** → Encrypted file uploaded to Arweave (permanent storage)
4. **Generate Metadata** → NFT metadata includes both Arweave and Supabase URLs
5. **Mint NFT** → NFT is minted with metadata pointing to both storage locations

### Download/Decrypt Flow

1. **Check NFT Ownership** → Verify user owns the NFT
2. **Fetch Metadata** → Get metadata from Arweave (contains both URLs)
3. **Try Arweave First** → Attempt to download from Arweave gateways
4. **Fallback to Supabase** → If Arweave fails, download from Supabase
5. **Decrypt & Serve** → Decrypt the file and serve to user

## Storage Bucket Policies (Optional)

For private buckets, you may want to set up RLS (Row Level Security) policies. However, the current implementation uses service role key which bypasses RLS.

For public buckets, files are accessible via direct URL.

## Troubleshooting

### Files Not Uploading to Supabase

1. Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
2. Verify the bucket exists and is named correctly
3. Check bucket permissions and file size limits
4. Review backend logs for error messages

### Files Not Downloading from Supabase

1. Verify the Supabase URL in metadata is correct
2. Check if the file exists in your Supabase storage dashboard
3. For private buckets, ensure signed URLs are being generated correctly
4. Check network connectivity to Supabase

### Supabase Not Used as Fallback

- Supabase is only used if Arweave fails
- Check that Supabase is properly configured (will see warnings in logs if not)
- The system gracefully degrades if Supabase is not configured

## Cost Considerations

- **Supabase Free Tier**: 
  - 1GB storage
  - 2GB bandwidth
- **Supabase Pro Tier**: 
  - More storage and bandwidth available
  - Pay-as-you-go pricing

Since Supabase is used as temporary/fallback storage and files are primarily stored on Arweave, usage should be minimal.

## Security Notes

- The service role key has admin privileges - keep it secure
- Encrypted files are stored - only NFT owners can decrypt
- Consider using private buckets if you want additional access control
- Files in Supabase can be deleted after Arweave confirmation (future feature)

