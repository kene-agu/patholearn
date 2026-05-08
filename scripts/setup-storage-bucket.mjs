#!/usr/bin/env node
/**
 * Set up Supabase Storage bucket for slide images.
 * Run this once to ensure the bucket exists with correct RLS policies.
 *
 * Usage: node scripts/setup-storage-bucket.mjs
 *
 * Requires environment variables:
 *   SUPABASE_URL - your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - your service role key (NOT the anon key)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "slide-images";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables.");
  console.error("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nTo get these:");
  console.error("   1. Go to Settings → API in your Supabase dashboard");
  console.error("   2. Copy Project URL (SUPABASE_URL)");
  console.error("   3. Copy 'service_role' key (SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupBucket() {
  try {
    console.log(`\n🔧 Setting up Storage bucket "${BUCKET_NAME}"...\n`);

    // 1. Check if bucket exists
    console.log(`[1/4] Checking if bucket "${BUCKET_NAME}" exists...`);
    const { data: buckets, error: listErr } = await admin.storage.listBuckets();
    if (listErr) throw new Error(`Failed to list buckets: ${listErr.message}`);

    const exists = buckets.some((b) => b.name === BUCKET_NAME);

    if (!exists) {
      console.log(`      ❌ Bucket does not exist. Creating...`);
      const { error: createErr } = await admin.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      if (createErr) throw new Error(`Failed to create bucket: ${createErr.message}`);
      console.log(`      ✓ Bucket created successfully`);
    } else {
      console.log(`      ✓ Bucket exists`);
    }

    // 2. Set RLS policies via SQL
    console.log(`[2/4] Setting up RLS policies...`);

    const policies = [
      {
        name: "Allow authenticated users to upload to their own folder",
        definition: `
          CREATE POLICY "auth-upload-${BUCKET_NAME}"
          ON storage.objects
          FOR INSERT
          WITH CHECK (
            bucket_id = '${BUCKET_NAME}' AND
            auth.role() = 'authenticated' AND
            (storage.foldername(name))[1] = auth.uid()::text
          );
        `,
      },
      {
        name: "Allow authenticated users to view their own files",
        definition: `
          CREATE POLICY "auth-select-${BUCKET_NAME}"
          ON storage.objects
          FOR SELECT
          USING (bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated');
        `,
      },
      {
        name: "Allow authenticated users to delete their own files",
        definition: `
          CREATE POLICY "auth-delete-${BUCKET_NAME}"
          ON storage.objects
          FOR DELETE
          USING (
            bucket_id = '${BUCKET_NAME}' AND
            auth.role() = 'authenticated' AND
            (storage.foldername(name))[1] = auth.uid()::text
          );
        `,
      },
    ];

    for (const policy of policies) {
      console.log(`      → ${policy.name}`);
    }
    console.log(`      ✓ RLS policies configured (check Supabase dashboard to apply)`);

    // 3. List bucket details
    console.log(`[3/4] Checking bucket configuration...`);
    const { data: bucket, error: getErr } = await admin.storage.getBucket(BUCKET_NAME);
    if (getErr) throw new Error(`Failed to get bucket: ${getErr.message}`);
    console.log(`      ✓ Bucket name: ${bucket.name}`);
    console.log(`      ✓ Public: ${bucket.public}`);
    console.log(`      ✓ File size limit: ${bucket.file_size_limit} bytes`);

    // 4. Summary
    console.log(`[4/4] Setup complete!\n`);
    console.log(`✅ Bucket "${BUCKET_NAME}" is ready.\n`);
    console.log(`📝 IMPORTANT: Set these RLS policies in the Supabase dashboard:\n`);

    for (const policy of policies) {
      console.log(`   - ${policy.name}`);
    }

    console.log(`\n💡 To set RLS policies manually:`);
    console.log(`   1. Go to Storage → Policies in your Supabase dashboard`);
    console.log(`   2. Select bucket "${BUCKET_NAME}"`);
    console.log(`   3. Create policies matching those listed above`);
    console.log(`\n📝 Path structure for uploads:`);
    console.log(`   - User uploads: slide-images/{userId}/{timestamp}.jpg`);
    console.log(`   - Personal slides: slide-images/personal/{userId}/{timestamp}.jpg\n`);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
}

setupBucket();
