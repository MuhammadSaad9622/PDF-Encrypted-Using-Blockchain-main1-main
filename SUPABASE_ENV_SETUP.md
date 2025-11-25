# Supabase Environment Variables Setup

This document lists all the environment variables needed to configure Supabase integration for temporary file storage and fallback mechanism.

## Required Environment Variables

Add these to your `backend/.env` file:

### 1. SUPABASE_URL
- **Description**: Your Supabase project URL
- **Format**: `https://your-project-id.supabase.co`
- **Where to find**: 
  1. Go to your Supabase project dashboard
  2. Navigate to **Settings** → **API**
  3. Copy the **Project URL** (under "Project URL" section)
- **Example**:
  ```env
  SUPABASE_URL=https://abcdefghijklmnop.supabase.co
  ```

### 2. SUPABASE_SERVICE_ROLE_KEY
- **Description**: Service role key with admin privileges (for backend operations)
- **Format**: Long JWT token string
- **Where to find**:
  1. Go to your Supabase project dashboard
  2. Navigate to **Settings** → **API**
  3. Under "Project API keys" section, find the **`service_role`** key
  4. Click **Reveal** to show the key
  5. Copy the entire key
- **⚠️ IMPORTANT**: 
  - Never expose this key in frontend code
  - Never commit this key to version control
  - This key has admin privileges and can bypass Row Level Security
- **Example**:
  ```env
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

### 3. SUPABASE_STORAGE_BUCKET (Optional)
- **Description**: Name of the storage bucket in Supabase
- **Default**: `encrypted-pdfs` (if not specified)
- **Format**: String (bucket name)
- **Where to set**:
  1. Go to your Supabase project dashboard
  2. Navigate to **Storage**
  3. Create a bucket with this name (or use an existing one)
- **Example**:
  ```env
  SUPABASE_STORAGE_BUCKET=encrypted-pdfs
  ```

## Complete .env Example

Here's a complete example of the backend `.env` file with all required variables:

```env
# Blockchain Configuration
PRIVATE_KEY=your_wallet_private_key_here
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com

# Bundlr/Arweave Configuration
BUNDLR_NODE=https://node1.bundlr.network
BUNDLR_CURRENCY=matic

# Supabase Configuration (for temporary file storage and fallback)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_STORAGE_BUCKET=encrypted-pdfs

# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pdf-encryption

# JWT Secret
JWT_SECRET=your_jwt_secret_here
```

## Setup Checklist

- [ ] Created Supabase project at [supabase.com](https://supabase.com)
- [ ] Created storage bucket named `encrypted-pdfs` (or your preferred name)
- [ ] Got `SUPABASE_URL` from Settings → API
- [ ] Got `SUPABASE_SERVICE_ROLE_KEY` from Settings → API → service_role key
- [ ] Added all three variables to `backend/.env` file
- [ ] Restarted backend server after adding variables
- [ ] Verified Supabase uploads are working (check backend logs)

## Verification

After setting up the environment variables:

1. **Check backend logs** when starting the server:
   ```
   ✅ Supabase client initialized
   ```
   If you see warnings about Supabase not being configured, check your .env file.

2. **Test upload**: Upload a PDF and check logs for:
   ```
   📤 Starting Supabase upload in background (fallback storage)...
   ✅ File uploaded to Supabase (background): https://...
   ```

3. **Check Supabase dashboard**: Go to Storage → encrypted-pdfs bucket and verify files are being uploaded.

## Troubleshooting

### "Supabase is not configured" warning
- **Cause**: Missing or incorrect environment variables
- **Solution**: 
  1. Verify all three variables are in `backend/.env`
  2. Check for typos in variable names (must be exact: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`)
  3. Restart the backend server after adding variables

### "Failed to upload to Supabase" error
- **Cause**: Invalid service role key or bucket doesn't exist
- **Solution**:
  1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (full key from dashboard)
  2. Check that the bucket exists in Supabase Storage
  3. Verify bucket name matches `SUPABASE_STORAGE_BUCKET` (case-sensitive)

### Supabase upload works but files not accessible
- **Cause**: Bucket might be private or has incorrect permissions
- **Solution**:
  1. Go to Storage → Your bucket → Settings
  2. Check if bucket is public or private
  3. For private buckets, the system uses signed URLs automatically
  4. For public buckets, ensure public access is enabled

## Notes

- Supabase integration is **optional** - the system works without it (Arweave-only mode)
- If Supabase is not configured, files will only be stored on Arweave
- Supabase is used as a **fallback** - Arweave remains the primary storage
- Supabase uploads happen in **background** and don't block the main upload flow
- Files are always encrypted before being uploaded to Supabase

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use service role key only on backend** - never in frontend code
3. **Rotate keys periodically** if compromised
4. **Use environment variables** in production (not hardcoded values)
5. **Monitor Supabase usage** to prevent unexpected costs
