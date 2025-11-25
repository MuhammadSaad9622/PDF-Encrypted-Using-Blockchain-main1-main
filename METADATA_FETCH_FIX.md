# Metadata Fetch Fix - Multiple Gateway Support

## Problem
The metadata fetch was failing with 404 errors because it was only trying one gateway URL. When metadata wasn't available on that specific gateway, the entire decryption process would fail, preventing access to the Supabase fallback.

**Error seen:**
```
Failed to fetch metadata after 3 attempts. HTTP 404: Not Found
```

## Root Cause
The `decryptFile` function was only attempting to fetch metadata from the single URL provided by `tokenURI`. If that specific gateway was unavailable or the metadata hadn't propagated yet, it would fail immediately without trying alternative gateways.

## Solution
Updated the metadata fetch logic to try **multiple Arweave gateways** in the same way that file fetching works:

### Changes Made
1. **Extract Arweave ID from tokenURI** - Parse the transaction ID from the tokenURI
2. **Try Multiple Gateways** - Attempt to fetch metadata from:
   - `https://arweave.net/{id}` (PRIMARY)
   - `https://ar-io.net/{id}` (Fallback)
   - `https://arweave.live/{id}` (Alternative)
   - Original tokenURI (Last resort)
3. **Retry Logic** - Retry up to 3 times across all gateways with exponential backoff
4. **Better Error Messages** - More informative errors that explain what happened

### Code Changes
**File:** `backend/controllers/pdfController.js`

The metadata fetch now:
- Tries multiple gateways before giving up
- Handles 404 errors gracefully by trying the next gateway
- Provides better logging to track which gateway succeeds
- Only fails after all gateways and retries are exhausted

## How It Works Now

1. **Get tokenURI from contract** → Extract Arweave transaction ID
2. **Try metadata gateways** (in order):
   - arweave.net (primary)
   - ar-io.net (fallback)
   - arweave.live (alternative)
   - original tokenURI (last resort)
3. **Retry up to 3 times** if all gateways fail
4. **Once metadata is fetched**, extract Supabase URL and fetch file if Arweave fails

## Expected Behavior

### Before Fix:
- Single gateway attempt → 404 error → Decryption fails
- No Supabase fallback possible (no metadata = no Supabase URL)

### After Fix:
- Multiple gateway attempts → One succeeds → Metadata retrieved
- If metadata found → Extract Supabase URL → Can use Supabase fallback for file

## Testing

To verify the fix works:

1. **Check backend logs** when viewing a PDF:
   ```
   📋 Fetching metadata for token X from multiple gateways...
   Fetching metadata from https://arweave.net/... (attempt 1/3)
   ✅ Metadata fetched successfully from https://arweave.net/...
   ```

2. **If metadata is not available** on first gateway, you'll see:
   ```
   Metadata not found at https://arweave.net/... (404), trying next gateway...
   Fetching metadata from https://ar-io.net/... (attempt 1/3)
   ✅ Metadata fetched successfully from https://ar-io.net/...
   ```

3. **If all gateways fail**, you'll see:
   ```
   ❌ Failed to fetch metadata after 3 attempts from all gateways
   ```

## Next Steps

If metadata is still unavailable on all gateways (rare):
- The metadata may still be propagating (wait a few minutes)
- The metadata may have been uploaded incorrectly (check upload process)
- Consider storing metadata in database as backup (future enhancement)

## Related Issues Fixed

- ✅ Metadata 404 errors now try multiple gateways
- ✅ Better error messages for debugging
- ✅ Improved logging for tracking metadata fetch attempts
- ✅ Enables Supabase fallback by ensuring metadata is retrieved

## Notes

- **Metadata must be available** for Supabase fallback to work (it contains the Supabase URL)
- If metadata isn't on any gateway, Supabase fallback cannot be used
- This fix makes metadata fetching much more reliable
- Files uploaded after this fix will benefit immediately
