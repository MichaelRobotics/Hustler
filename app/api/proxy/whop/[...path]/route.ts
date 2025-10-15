import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { pathname, searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    
    console.log('Proxy resource request for path:', pathname);
    console.log('Target URL:', targetUrl);
    
    if (!targetUrl) {
      console.log('No URL parameter provided for resource');
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate that it's a whop.com URL for security
    if (!targetUrl.includes('whop.com')) {
      console.log('Invalid URL - not whop.com:', targetUrl);
      return NextResponse.json({ error: 'Only whop.com URLs are allowed' }, { status: 400 });
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(targetUrl);
    console.log('Decoded URL:', decodedUrl);

    console.log('Fetching resource from:', decodedUrl);

    // Fetch the resource from the target URL
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Referer': 'https://whop.com/',
      },
    });

    console.log('Resource response status:', response.status);

    if (!response.ok) {
      console.log('Failed to fetch resource, status:', response.status);
      return NextResponse.json({ 
        error: `Failed to fetch resource: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    const content = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    console.log('Resource content type:', contentType);
    console.log('Resource content length:', content.byteLength);

    // Return the resource with proper headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Frame-Options': 'ALLOWALL',
      },
    });

  } catch (error) {
    console.error('Proxy resource error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
