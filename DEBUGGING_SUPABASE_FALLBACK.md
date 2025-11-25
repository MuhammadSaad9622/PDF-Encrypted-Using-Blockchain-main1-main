# Debugging Supabase Fallback Issues

## Issue: 500 Error When Viewing PDF

If you're getting a 500 error when trying to view/decrypt a PDF, here's how to debug and fix it.

## What Was Fixed

1. **Better Error Logging**: Added detailed logging to show exactly what's happening
2. **Improved Supabase Fallback**: Enhanced error handling for Supabase downloads
3. **Better Error Messages**: More informative error messages for debugging

## How to Debug

### Step 1: Check Backend Logs

When you try to view a PDF, check your backend console logs. You should see:

```
Starting encrypted data fetch - trying Arweave FIRST (PRIMARY storage)...
📋 Storage info from metadata: { ... }
```

**Look for these log messages:**

1. **Storage Info Log**: Shows what URLs are available
   ```
   📋 Storage info from metadata:
   - arweaveUrl: Present/Missing
   - supabaseUrl: Present/Missing  
   - supabasePath: Present/Missing
   - supabaseConfigured: true/false
   ```

2. **Arweave Attempts**: Shows Arweave fetch attempts
   ```
   Attempting to fetch from arweave.net...
   ❌ Failed to fetch from Arweave after 3 attempts
   ```

3. **Supabase Fallback**: Shows if Supabase is being tried
   ```
   ⚠️ Arweave fetch failed after all attempts, now trying Supabase fallback...
   📥 Attempting to download from Supabase...
   ```

4. **Error Details**: Shows the actual error
   ```
   ❌ Decryption failed: [error message]
   Error stack: [stack trace]
   ```

### Step 2: Common Issues & Solutions

#### Issue 1: "Supabase is not configured"
**Problem**: Supabase credentials not set in `.env`

**Solution**: Add to `backend/.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=encrypted-pdfs
```

#### Issue 2: "Supabase URL not found in metadata"
**Problem**: NFT was minted before Supabase integration, so metadata doesn't have Supabase URL

**Solution**: This is expected for older NFTs. They will only use Arweave.

#### Issue 3: "Supabase download failed"
**Problem**: File not in Supabase or bucket doesn't exist

**Solution**: 
1. Check Supabase Dashboard → Storage → encrypted-pdfs bucket
2. Verify the file exists
3. Check bucket permissions

#### Issue 4: Metadata doesn't have Supabase info
**Problem**: NFT metadata structure might be different

**Check**: Look at the metadata log output:
```
📄 Metadata structure (first 500 chars): { ... }
```

## Testing the Flow

### Test 1: With Supabase Configured

1. Ensure Supabase is configured in `.env`
2. Upload a new PDF (should upload to both Arweave and Supabase)
3. Try to view the PDF
4. Check logs for:
   - Arweave attempts (should try first)
   - Supabase fallback (if Arweave fails)

### Test 2: Without Supabase

1. Remove Supabase credentials from `.env`
2. Try to view a PDF
3. Should only use Arweave
4. If Arweave fails, should show error (no Supabase fallback)

## Expected Log Flow

### Successful Arweave Fetch:
```
Starting encrypted data fetch - trying Arweave FIRST (PRIMARY storage)...
Attempting to fetch from arweave.net...
✅ Successfully fetched file from Arweave (PRIMARY storage)
```

### Arweave Fails, Supabase Succeeds:
```
Starting encrypted data fetch - trying Arweave FIRST (PRIMARY storage)...
Attempting to fetch from arweave.net...
❌ Failed to fetch from Arweave after 3 attempts
⚠️ Arweave fetch failed after all attempts, now trying Supabase fallback...
📥 Attempting to download from Supabase using path: ...
✅ Successfully fetched encrypted data from Supabase
```

### Both Fail:
```
Starting encrypted data fetch - trying Arweave FIRST...
❌ Failed to fetch from Arweave after 3 attempts
⚠️ Arweave fetch failed, trying Supabase fallback...
❌ Supabase fallback failed: [error]
Error: Failed to fetch encrypted data from both Arweave and Supabase
```

## Quick Fix Checklist

- [ ] Check backend logs when viewing PDF
- [ ] Verify Supabase is configured (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Check if bucket `encrypted-pdfs` exists in Supabase
- [ ] Verify file exists in Supabase Storage
- [ ] Check metadata has Supabase URL (for new NFTs)
- [ ] Restart backend after changing `.env`
- [ ] Check if NFT metadata has `properties.storage.supabase` or `properties.file.fallbackUri`

## Next Steps

1. **Try viewing the PDF again** and check backend console logs
2. **Share the logs** - The detailed logging will show exactly what's failing
3. **Check Supabase Dashboard** - Verify files are being uploaded
4. **Verify metadata structure** - Ensure Supabase URL is in metadata for new uploads

## Note About Older NFTs

NFTs minted **before Supabase integration** will not have Supabase URLs in their metadata. For these:
- Only Arweave will be tried
- If Arweave fails, there's no fallback
- This is expected behavior

For **new NFTs** (minted after Supabase integration):
- Both Arweave and Supabase URLs are in metadata
- Arweave is tried first
- Supabase is used as fallback if Arweave fails
