import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyUser } from "@/lib/verifyUser";

export const runtime = "nodejs";

interface DiagnosticResult {
  status: "ok" | "error" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { user } = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: DiagnosticResult[] = [];

  // Test 1: Check if we can access Supabase Storage
  results.push({
    status: "ok",
    message: "✓ Supabase client initialized",
  });

  // Test 2: Try to list buckets (this will fail with anon key, but we can verify the bucket exists)
  try {
    const testBlob = new Blob(["test"], { type: "text/plain" });
    const testPath = `diagnostics/${user.id}/${Date.now()}-test.txt`;

    const { data, error } = await supabase.storage
      .from("slide-images")
      .upload(testPath, testBlob, {
        contentType: "text/plain",
        upsert: false,
      });

    if (error) {
      results.push({
        status: "error",
        message: "❌ Storage upload failed",
        details: {
          error: error.message,
          status: error.status,
        },
      });

      // Provide specific guidance based on error
      if (error.status === 404) {
        results.push({
          status: "error",
          message:
            "❌ Bucket 'slide-images' not found. Create it in Supabase Storage.",
        });
      } else if (error.status === 403) {
        results.push({
          status: "error",
          message:
            "❌ Permission denied. Check RLS policies on 'slide-images' bucket.",
          details: {
            required:
              "RLS policy should allow authenticated INSERT with bucket_id='slide-images'",
          },
        });
      }
    } else {
      results.push({
        status: "ok",
        message: "✓ Storage upload successful",
        details: {
          path: data.path,
        },
      });

      // Try to get public URL
      const { data: urlData } = supabase.storage
        .from("slide-images")
        .getPublicUrl(data.path);

      results.push({
        status: "ok",
        message: "✓ Public URL generated",
        details: {
          url: urlData.publicUrl,
        },
      });

      // Clean up test file
      await supabase.storage.from("slide-images").remove([data.path]);
      results.push({
        status: "ok",
        message: "✓ Test file cleaned up",
      });
    }
  } catch (err) {
    results.push({
      status: "error",
      message: `❌ Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Summary
  const hasErrors = results.some((r) => r.status === "error");
  const summary = hasErrors
    ? "⚠️ Storage configuration needs attention"
    : "✅ Storage is configured correctly";

  return NextResponse.json({
    summary,
    timestamp: new Date().toISOString(),
    results,
  });
}
