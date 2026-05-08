# Supabase Storage Bucket Setup

## Overview

PathoLearn uses a Supabase Storage bucket called **`slide-images`** to store user-uploaded histopathology slides. This document explains how to set it up correctly.

## Quick Diagnosis

If users are seeing "No image" in My Cases instead of the slides they uploaded:

### Step 1: Run the Diagnostic

Open your browser console and run:

```javascript
const response = await fetch('/api/diagnostics/storage', { method: 'POST' });
const result = await response.json();
console.log(result);
```

This will tell you exactly what's wrong.

### Step 2: Identify the Problem

- **❌ 404 error**: Bucket doesn't exist → Go to [Create Bucket](#create-bucket)
- **❌ 403 error**: Permission denied → Go to [Set RLS Policies](#set-rls-policies)
- **✅ All green**: Bucket is configured correctly

## Create Bucket

If the bucket doesn't exist:

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Set these values:
   - **Bucket name**: `slide-images` (exactly this)
   - **Privacy**: Private (not public)
   - **File size limit**: 10 MB
6. Click **Create bucket**

## Set RLS Policies

Once the bucket exists, you need to set up Row Level Security (RLS) policies.

### Option A: Manual Setup (recommended)

1. In Supabase dashboard, go to **Storage** → **Policies**
2. Select the `slide-images` bucket
3. Click **New policy** for each of the following:

#### Policy 1: Allow authenticated users to upload

- **Name**: `auth-upload`
- **Target roles**: `authenticated`
- **Operation**: `INSERT`
- **Expression**: Use the "With check" editor and enter:

```sql
(bucket_id = 'slide-images') 
AND (auth.role() = 'authenticated')
```

(Note: This allows any authenticated user to upload anywhere. If you need stricter path-based restrictions, see "Option B" below.)

#### Policy 2: Allow authenticated users to read

- **Name**: `auth-select`
- **Target roles**: `authenticated`
- **Operation**: `SELECT`
- **Expression**:

```sql
bucket_id = 'slide-images' AND auth.role() = 'authenticated'
```

#### Policy 3: Allow authenticated users to delete their own files

- **Name**: `auth-delete`
- **Target roles**: `authenticated`
- **Operation**: `DELETE`
- **Expression**:

```sql
bucket_id = 'slide-images' AND auth.role() = 'authenticated'
```

### Option B: Strict Path-Based Policies (advanced)

If you want to restrict users to their own folder:

```sql
-- For INSERT
(bucket_id = 'slide-images') 
AND (auth.role() = 'authenticated')
AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[1] = 'personal')

-- For SELECT
bucket_id = 'slide-images' AND auth.role() = 'authenticated'

-- For DELETE
(bucket_id = 'slide-images')
AND (auth.role() = 'authenticated')
AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[1] = 'personal')
```

## Path Structure

User uploads are stored with this structure:

```
slide-images/
├── {userId}/
│   ├── 1714876543210.jpg      (from AnalysisPanel)
│   └── 1714876544320.jpg
│
└── personal/
    └── {userId}/
        ├── 1714876545430.jpg  (from PersonalSlides)
        └── 1714876546540.jpg
```

## Verification

After setup, verify it works:

1. Open the app in your browser
2. Upload a slide image in either:
   - **Analyzer**: Upload → Save to Flashcards
   - **My Slides**: Upload a new slide
3. Check **My Cases** → the slide should appear with the image thumbnail
4. Open browser DevTools → Console tab
5. You should see logs like:
   ```
   [AnalysisPanel] Uploading slide image to storage: {userId}/1714876543210.jpg
   [AnalysisPanel] Upload successful. Path: {userId}/1714876543210.jpg
   [AnalysisPanel] Public URL: https://...
   ```

## Troubleshooting

### "No image" appears in My Cases

**Most likely cause**: Upload succeeded but image_url wasn't saved to database.

Check:
1. Is the image in Supabase Storage? (Storage → browse the bucket)
2. Does the `slide_history` table have an `image_url` value? (Check Supabase Data Editor)
3. Check browser console for errors (see Verification section above)

### Upload shows error in console

**403 Forbidden**: Check RLS policies are correctly set (see above)

**404 Not Found**: Check that bucket name is exactly `slide-images`

**Network error**: Check that Supabase URL is correct in `.env.local`

## References

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [RLS Policy Guide](https://supabase.com/docs/guides/storage/uploads/restrict-downloads)
- [Supabase Row Level Security](https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security)

## Need Help?

If issues persist:

1. Run the diagnostic again: `/api/diagnostics/storage`
2. Check Supabase Storage logs for error details
3. Verify environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (should match your project)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (should be valid)
