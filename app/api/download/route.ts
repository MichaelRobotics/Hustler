import { NextRequest, NextResponse } from "next/server";
import { isAllowedDownloadUrl, safeDownloadFilename } from "@/lib/helpers/download-url";
import { requireRequestExperience } from "@/lib/helpers/experience-access-gate";

// Vercel serverless function config
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/download - Server-side download proxy
 * Fetches media from URL and streams it back with proper download headers
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "download.png";

  if (!blobUrl) {
    return NextResponse.json({ error: "Missing parameter URL" }, { status: 400 });
  }

  const access = await requireRequestExperience(request);
  if (!access.ok) return access.response;

  let target: string;
  try {
    target = decodeURIComponent(blobUrl);
  } catch {
    return NextResponse.json({ error: "Invalid download URL" }, { status: 400 });
  }
  if (!isAllowedDownloadUrl(target)) {
    return NextResponse.json({ error: "Download URL is not allowed" }, { status: 400 });
  }

  try {
    const response = await fetch(target, { redirect: "error" });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const contentLength = buffer.byteLength;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${safeDownloadFilename(filename)}"`,
        "Content-Type": "application/octet-stream",
        "Content-Length": contentLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

