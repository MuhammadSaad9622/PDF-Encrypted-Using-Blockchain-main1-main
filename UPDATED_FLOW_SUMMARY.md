# Updated Upload & Download Flow Summary

## Overview

The system now uses **Arweave as PRIMARY storage** with **Supabase as BACKGROUND fallback** storage. Files are uploaded to both locations, but Arweave is prioritized for all operations.

## Upload Flow (Primary → Background)

### 1. Encryption Phase
- PDF is encrypted with AES-256-CBC
- Encryption key generated

### 2. Arweave Upload (PRIMARY - Blocking)
- **File uploads to Arweave FIRST** (blocking operation)
- This is the primary storage location
- User waits for this to complete
- Arweave URL is immediately available

### 3. Supabase Upload (BACKGROUND - Non-blocking)
- **Supabase upload starts in background** (fire-and-forget)
- Does NOT block the main upload flow
- Happens in parallel while metadata is being processed
- If it completes quickly (< 2 seconds), included in response
- Otherwise, continues uploading in background

### 4. Metadata Generation
- Metadata is generated with:
  - **Primary URI**: Arweave URL (always present)
  - **Fallback URI**: Supabase URL (if available)
  - **Storage info**: Both Arweave and Supabase details

### 5. Metadata Upload to Arweave
- Metadata uploaded to Arweave (primary metadata location)
- NFT is minted with Arweave metadata URL

### 6. Response to User
- Response includes:
  - Arweave URLs (primary)
  - Supabase URLs (if upload completed)
  - Metadata object
  - Transaction hash

**Result**: User sees immediate response, Supabase upload continues in background

## Download/Decrypt Flow (Arweave First → Supabase Fallback)

### 1. Verify Ownership
- Check if user owns the NFT

### 2. Fetch Metadata
- Get metadata from Arweave (via tokenURI)
- Metadata contains both Arweave and Supabase URLs

### 3. Quick Arweave Availability Check
- Quickly check if Arweave file is available (5 second timeout)
- Uses HEAD request (fast check)
- 2 quick attempts across multiple gateways

### 4. Decision Point

#### If Arweave is Available:
- Fetch file from Arweave (PRIMARY)
- Multiple gateways tried: ar-io.net, arweave.net, arweave.live
- Retry logic with exponential backoff

#### If Arweave is NOT Available Yet:
- **Immediately use Supabase** (fast fallback)
- Skip Arweave retry loops
- Download directly from Supabase

### 5. Decryption
- Decrypt file using encryption key from metadata
- Serve decrypted PDF to user

**Result**: 
- **Fast access** if Arweave is ready (primary)
- **Immediate fallback** to Supabase if Arweave is still propagating
- **Always works** - user always gets their file

## Environment Variables for Supabase

You need **3 environment variables** in your `backend/.env` file:

### Required Variables:

1. **SUPABASE_URL**
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   ```
   - Get from: Supabase Dashboard → Settings → API → Project URL

2. **SUPABASE_SERVICE_ROLE_KEY**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   - Get from: Supabase Dashboard → Settings → API → service_role key
   - ⚠️ Keep this secret! Never expose in frontend code

3. **SUPABASE_STORAGE_BUCKET** (Optional)
   ```
   SUPABASE_STORAGE_BUCKET=encrypted-pdfs
   ```
   - Default: `encrypted-pdfs`
   - Create bucket in: Supabase Dashboard → Storage

### Complete Example:

```env
# Supabase Configuration (for background upload and fallback)
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=encrypted-pdfs
```

## How It Works

### Upload Timing:
```
Time 0s:  [Encrypt PDF]
Time 2s:  [Upload to Arweave] ← USER WAITS (blocking)
          [Upload to Supabase] ← BACKGROUND (non-blocking)
Time 5s:  [Generate Metadata]
Time 6s:  [Upload Metadata to Arweave]
Time 7s:  [Mint NFT] → RESPONSE TO USER
Time 10s: [Supabase upload completes] ← Still running in background
```

### Download Timing:
```
Time 0s:  [Check Arweave availability] (quick check, 5s timeout)
Time 2s:  Decision:
          - If Arweave available → Fetch from Arweave (PRIMARY)
          - If Arweave not available → Fetch from Supabase (FALLBACK)
Time 5s:  [Decrypt & Serve]
```

## Benefits

1. **Arweave is Primary**: Always the main storage, decentralized, permanent
2. **Fast Access**: Supabase provides immediate fallback if Arweave isn't ready
3. **Non-blocking Uploads**: Supabase upload doesn't slow down the process
4. **Reliability**: Multiple fallback layers ensure files are always accessible
5. **User Experience**: Users get immediate response, background uploads continue

## Notes

- **Supabase is OPTIONAL**: System works without it (Arweave-only mode)
- **Arweave is ALWAYS primary**: Even when Supabase is used, metadata points to Arweave
- **Background uploads**: Supabase uploads happen in background, don't block user
- **Smart fallback**: System automatically detects if Arweave is ready and chooses best source

## Setup Checklist

- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Create storage bucket named `encrypted-pdfs`
- [ ] Get `SUPABASE_URL` from Settings → API
- [ ] Get `SUPABASE_SERVICE_ROLE_KEY` from Settings → API → service_role
- [ ] Add all 3 variables to `backend/.env`
- [ ] Restart backend server
- [ ] Test upload - check logs for background Supabase upload
- [ ] Test download - verify Arweave-first, Supabase-fallback logic

See `SUPABASE_ENV_SETUP.md` for detailed setup instructions.
