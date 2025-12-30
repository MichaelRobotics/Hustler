import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

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

  try {
    const headersList = await headers();
    const response = await fetch(decodeURIComponent(blobUrl), {
      headers: {
        "User-Agent": headersList.get("user-agent") || "",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const contentLength = buffer.byteLength;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
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

