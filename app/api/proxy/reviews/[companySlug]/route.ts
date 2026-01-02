import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper function to extract company slug and target URL
function extractTargetUrl(request: NextRequest): { companySlug: string | null; targetUrl: string | null } {
  const { pathname, searchParams } = new URL(request.url);
  
  // Extract companySlug from path: /api/proxy/reviews/[companySlug]
  const pathParts = pathname.split('/').filter(Boolean);
  const companySlugIndex = pathParts.indexOf('reviews');
  const companySlug = companySlugIndex !== -1 && pathParts[companySlugIndex + 1] ? pathParts[companySlugIndex + 1] : null;
  
  // Get target URL from query params or construct from companySlug
  let targetUrl = searchParams.get('url');
  
  if (!targetUrl && companySlug) {
    // Construct Whop review URL: https://whop.com/{companySlug}/reviews/
    targetUrl = `https://whop.com/${companySlug}/reviews/`;
  }
  
  return { companySlug, targetUrl };
}

// Helper function to modify HTML with comprehensive script injection
function modifyHtmlForIframe(html: string, companySlug: string | null): string {
  return html
    // Remove X-Frame-Options meta tags
    .replace(/<meta[^>]*http-equiv="X-Frame-Options"[^>]*>/gi, '')
    // Remove Content-Security-Policy frame-ancestors
    .replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*frame-ancestors[^>]*>/gi, '')
    // CRITICAL: Inject base tag and fetch interception FIRST, before any other scripts
    // Combine into single replace to avoid conflicts
    .replace(/<head>/i, `<head>
      <base href="https://whop.com/">
      <script>
        // IMMEDIATE fetch interception - MUST run before ANY other scripts
        // Run immediately, even before DOM is ready
        (function() {
          if (window.fetchIntercepted) return; // Prevent double interception
          window.fetchIntercepted = true;
          
          const originalFetch = window.fetch;
          const currentHost = window.location.hostname;
          const currentPort = window.location.port ? ':' + window.location.port : '';
          const currentOrigin = window.location.protocol + '//' + currentHost + currentPort;
          
          console.log('🚀 Installing fetch interception immediately. Current origin:', currentOrigin);
          
          window.fetch = function(url, options) {
            // Extract URL string from Request object if needed - do this FIRST
            let urlString = typeof url === 'string' ? url : (url instanceof Request ? url.url : String(url));
            const originalUrlString = urlString;
            
            console.log('🔍 Fetch intercepted:', urlString, '| Original:', originalUrlString);
            
            // Block problematic API calls that cause white flashes
            const blockedPatterns = [
              '/api/auth/token',
              '/core/api/flags/experiment/',
              '/api/v3/track/',
              '/messages?',
              '/_static/worker/',
              '/_static/fonts/',
              '/site.webmanifest',
              '/schemaFilter.',
              '/api/graphql/GenerateWebsocketJwt',
              'FFF-AcidGrotesk-Bold.woff2',
              '/_vercel/speed-insights/',
              '/_next/static/chunks/ajs-destination'
            ];
            
            const isBlocked = blockedPatterns.some(pattern => urlString.includes(pattern));
            if (isBlocked) {
              console.log('🚫 Blocked problematic API call:', urlString);
              // Return immediate mock response to prevent white flash
              return Promise.resolve(new Response(JSON.stringify({ 
                success: true, 
                data: null,
                message: 'Blocked for iframe compatibility'
              }), {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
              }));
            }
            
            // Convert proxy domain URLs to whop.com (for production) - MUST happen before relative URL check
            // Check for any proxy domain pattern or current host if it's a proxy domain
            if (urlString.includes('.apps.whop.com') || 
                (urlString.startsWith('http') && urlString.includes(currentHost) && currentHost.includes('.apps.whop.com')) ||
                (urlString.includes(currentHost) && currentHost.includes('.apps.whop.com'))) {
              // Replace the entire origin (protocol + host + port) with whop.com
              urlString = urlString.replace(/https?:\/\/[^\/]+/, 'https://whop.com');
              console.log('✅ Converted proxy domain URL to whop.com:', originalUrlString, '->', urlString);
            }
            
            // Convert relative URLs to absolute for allowed requests
            if (urlString.startsWith('/')) {
              urlString = 'https://whop.com' + urlString;
              console.log('✅ Fetch converted to absolute URL:', urlString);
            } else if (urlString.includes('whop.com')) {
              console.log('✅ Fetch already absolute URL:', urlString);
            } else {
              console.log('✅ Fetch external URL:', urlString);
            }
            
            // Update the url parameter if it was converted
            if (urlString !== originalUrlString) {
              if (typeof url === 'string') {
                url = urlString;
              } else if (url instanceof Request) {
                // Create new Request with updated URL, preserving all original Request properties
                const requestInit = {
                  method: url.method,
                  headers: url.headers,
                  body: url.bodyUsed ? null : url.body,
                  mode: url.mode,
                  credentials: url.credentials,
                  cache: url.cache,
                  redirect: url.redirect,
                  referrer: url.referrer,
                  integrity: url.integrity,
                  keepalive: url.keepalive,
                  signal: url.signal,
                  ...options
                };
                url = new Request(urlString, requestInit);
              }
            }
            
            // Handle the request and catch 404s gracefully
            return originalFetch.call(this, url, options)
              .then(response => {
                if (!response.ok && response.status === 404) {
                  console.log('⚠️ API endpoint not found (404):', urlString);
                  // Return a mock response for 404s to prevent errors
                  return new Response(JSON.stringify({ error: 'Endpoint not available' }), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
                return response;
              })
              .catch(error => {
                console.log('❌ Fetch error for:', urlString, error);
                // Return a mock response for network errors
                return new Response(JSON.stringify({ error: 'Network error' }), {
                  status: 200,
                  statusText: 'OK',
                  headers: { 'Content-Type': 'application/json' }
                });
              });
          };
          
          console.log('🚀 Fetch interception installed IMMEDIATELY');
        })();
      </script>
      <script>
        // Override document.baseURI immediately
        try {
          Object.defineProperty(document, 'baseURI', {
            get: function() { return 'https://whop.com/'; },
            configurable: true
          });
          console.log('✅ Document baseURI overridden');
        } catch (e) {
          console.log('⚠️ Could not override document.baseURI:', e.message);
        }
        
        // Override location properties safely
        try {
          Object.defineProperty(location, 'origin', {
            get: function() { return 'https://whop.com'; },
            configurable: true
          });
          console.log('✅ Location origin overridden');
        } catch (e) {
          console.log('⚠️ Could not override location.origin:', e.message);
        }
        
        try {
          Object.defineProperty(location, 'host', {
            get: function() { return 'whop.com'; },
            configurable: true
          });
          console.log('✅ Location host overridden');
        } catch (e) {
          console.log('⚠️ Could not override location.host:', e.message);
        }
        
        try {
          Object.defineProperty(location, 'hostname', {
            get: function() { return 'whop.com'; },
            configurable: true
          });
          console.log('✅ Location hostname overridden');
        } catch (e) {
          console.log('⚠️ Could not override location.hostname:', e.message);
        }
        
        console.log('🌐 Document base URI overrides installed');
      </script>`)
    // Add comprehensive error handling and fallback script
    .replace(/<head>/i, `<head>
      <script>
        // Error handling for resources
        window.addEventListener('error', function(e) {
          console.log('Resource error:', e.target.src || e.target.href);
          // Try to fix broken resource URLs by making them absolute
          if (e.target.src && e.target.src.startsWith('/')) {
            e.target.src = 'https://whop.com' + e.target.src;
          }
          if (e.target.href && e.target.href.startsWith('/')) {
            e.target.href = 'https://whop.com' + e.target.href;
          }
        });
        
        // Intercept all resource loading to prevent problematic requests
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
          const element = originalCreateElement.call(this, tagName);
          
          if (tagName.toLowerCase() === 'link' || tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
              if (name === 'href' || name === 'src') {
                // Block problematic resources
                const blockedPatterns = [
                  'FFF-AcidGrotesk-Bold.woff2',
                  '/_static/fonts/',
                  '/_vercel/speed-insights/',
                  '/_next/static/chunks/ajs-destination',
                  '/_static/worker/',
                  '/api/auth/token',
                  '/core/api/flags/experiment/',
                  '/api/v3/track/',
                  '/messages?',
                  '/site.webmanifest',
                  '/schemaFilter.',
                  '/api/graphql/GenerateWebsocketJwt'
                ];
                
                const isBlocked = blockedPatterns.some(pattern => value.includes(pattern));
                if (isBlocked) {
                  console.log('🚫 Blocked resource loading:', value);
                  return; // Don't set the attribute
                }
                
                // Convert relative URLs to absolute
                if (value.startsWith('/')) {
                  value = 'https://whop.com' + value;
                  console.log('✅ Resource converted to absolute URL:', value);
                }
              }
              return originalSetAttribute.call(this, name, value);
            };
          }
          
          return element;
        };
        
        // NOTE: Fetch interception is already handled by the early script above
        // This section is kept for other resource interception (createElement, XHR, etc.)
          
          // Override XMLHttpRequest to handle older API calls
          const originalXHROpen = XMLHttpRequest.prototype.open;
          const originalXHRSend = XMLHttpRequest.prototype.send;
          
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
              console.log('🔍 XHR intercepted:', method, url);
              
              // Block problematic API calls that cause white flashes
              if (typeof url === 'string') {
                const blockedPatterns = [
                  '/api/auth/token',
                  '/core/api/flags/experiment/',
                  '/api/v3/track/',
                  '/messages?',
                  '/_static/worker/',
                  '/_static/fonts/',
                  '/site.webmanifest',
                  '/schemaFilter.',
                  '/api/graphql/GenerateWebsocketJwt',
                  'FFF-AcidGrotesk-Bold.woff2',
                  '/_vercel/speed-insights/',
                  '/_next/static/chunks/ajs-destination'
                ];
                
                const isBlocked = blockedPatterns.some(pattern => url.includes(pattern));
                if (isBlocked) {
                  console.log('🚫 Blocked problematic XHR call:', url);
                  // Store the blocked state for later handling
                  this._isBlocked = true;
                  return originalXHROpen.call(this, method, url, async, user, password);
                }
                
                // Convert proxy domain URLs to whop.com (for production) - MUST happen before relative URL check
                if (url.includes('.apps.whop.com')) {
                  url = url.replace(/https?:\/\/[^\/]+/, 'https://whop.com');
                  console.log('✅ Converted proxy domain XHR URL to whop.com:', url);
                }
                
                // Convert relative URLs to absolute for allowed requests
                if (url.startsWith('/')) {
                  url = 'https://whop.com' + url;
                  console.log('✅ XHR converted to absolute URL:', url);
                }
              }
              
              return originalXHROpen.call(this, method, url, async, user, password);
            };
          
          // Override XHR send to handle blocked requests and 404s gracefully
          XMLHttpRequest.prototype.send = function(data) {
            const xhr = this;
            const originalOnReadyStateChange = xhr.onreadystatechange;
            
            // Handle blocked requests immediately
            if (xhr._isBlocked) {
              console.log('🚫 XHR blocked, returning mock response immediately');
              // Simulate successful response for blocked requests
              setTimeout(() => {
                Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
                Object.defineProperty(xhr, 'status', { value: 200, writable: false });
                Object.defineProperty(xhr, 'statusText', { value: 'OK', writable: false });
                Object.defineProperty(xhr, 'responseText', { value: JSON.stringify({ 
                  success: true, 
                  data: null,
                  message: 'Blocked for iframe compatibility'
                }), writable: false });
                
                if (originalOnReadyStateChange) {
                  originalOnReadyStateChange.call(xhr);
                }
              }, 10); // Small delay to simulate network request
              return;
            }
            
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4 && xhr.status === 404) {
                console.log('⚠️ XHR endpoint not found (404):', xhr.responseURL);
                // Mock a successful response for 404s
                Object.defineProperty(xhr, 'status', { value: 200, writable: false });
                Object.defineProperty(xhr, 'statusText', { value: 'OK', writable: false });
                Object.defineProperty(xhr, 'responseText', { value: JSON.stringify({ error: 'Endpoint not available' }), writable: false });
              }
              if (originalOnReadyStateChange) {
                originalOnReadyStateChange.call(this);
              }
            };
            
            return originalXHRSend.call(this, data);
          };
          
          // Override sendBeacon for analytics
          const originalSendBeacon = navigator.sendBeacon;
          if (originalSendBeacon) {
            navigator.sendBeacon = function(url, data) {
              console.log('🔍 SendBeacon intercepted:', url);
              
              if (typeof url === 'string' && url.startsWith('/')) {
                url = 'https://whop.com' + url;
                console.log('✅ SendBeacon converted to absolute URL:', url);
              }
              
              return originalSendBeacon.call(this, url, data);
            };
          }
          
          console.log('🚀 API overrides installed successfully');
        })();
        
        // Handle navigation for review pages - allow navigation within iframe
        document.addEventListener('click', function(e) {
          const target = e.target.closest('a');
          if (target && target.href) {
            try {
              const url = new URL(target.href);
              const currentUrl = new URL(window.location.href);
              
              // For review-related links, navigate within iframe using proxy
              if (url.pathname.includes('/reviews/') && (url.hostname === 'whop.com' || url.hostname === window.location.hostname)) {
                e.preventDefault();
                
                // Extract company slug from URL pathname
                const pathParts = url.pathname.split('/').filter(Boolean);
                const companySlug = pathParts[0] || '${companySlug || ''}';
                
                // Build full whop.com URL if it's a relative path
                let fullUrl = url.href;
                if (url.hostname === window.location.hostname || url.hostname === '') {
                  // It's a relative URL or same-origin, convert to whop.com
                  fullUrl = 'https://whop.com' + url.pathname + (url.search || '') + (url.hash || '');
                }
                
                // Convert to proxy URL
                const proxyUrl = '/api/proxy/reviews/' + companySlug + '?url=' + encodeURIComponent(fullUrl);
                console.log('🔄 Navigating to review page via proxy:', proxyUrl);
                window.location.href = proxyUrl;
                return;
              }
              
              // For external links, open in new window
              if (url.hostname !== 'whop.com' && url.hostname !== window.location.hostname && url.hostname !== '') {
                e.preventDefault();
                
                // Clean the URL by removing the problematic subdomain
                let cleanUrl = target.href;
                if (cleanUrl.includes('ut0jno2kq2s3xmlimb2g.apps.')) {
                  cleanUrl = cleanUrl.replace('ut0jno2kq2s3xmlimb2g.apps.', '');
                  console.log('🧹 Cleaned URL:', cleanUrl);
                }
                
                window.open(cleanUrl, '_blank', 'noopener,noreferrer');
                return;
              }
              
              // For product pages on whop.com, open in new window
              if (url.hostname === 'whop.com' && url.pathname.includes('/products/')) {
                e.preventDefault();
                window.open(target.href, '_blank', 'noopener,noreferrer');
                return;
              }
            } catch (err) {
              console.log('⚠️ Error handling click:', err);
            }
          }
        });
        
        // Handle form submissions - intercept and proxy through POST
        document.addEventListener('submit', function(e) {
          const form = e.target;
          if (form && form.tagName === 'FORM') {
            const formAction = form.getAttribute('action') || '';
            const formMethod = (form.getAttribute('method') || 'GET').toUpperCase();
            
            // Only intercept forms that submit to whop.com
            if (formAction.includes('whop.com') || formAction.startsWith('/')) {
              e.preventDefault();
              
              // Extract company slug from current URL
              const currentPath = window.location.pathname;
              const pathParts = currentPath.split('/').filter(Boolean);
              const companySlugIndex = pathParts.indexOf('reviews');
              const companySlug = companySlugIndex !== -1 && pathParts[companySlugIndex + 1] ? pathParts[companySlugIndex + 1] : '${companySlug || ''}';
              
              // Build target URL
              let targetUrl = formAction;
              if (targetUrl.startsWith('/')) {
                targetUrl = 'https://whop.com' + targetUrl;
              }
              
              // Build proxy URL
              const proxyUrl = '/api/proxy/reviews/' + companySlug + '?url=' + encodeURIComponent(targetUrl);
              
              console.log('📝 Form submission intercepted, proxying through:', proxyUrl);
              
              // Create form data
              const formData = new FormData(form as HTMLFormElement);
              
              // Submit via fetch to proxy endpoint
              fetch(proxyUrl, {
                method: formMethod,
                body: formData,
                headers: {
                  'X-Requested-With': 'XMLHttpRequest'
                }
              })
              .then(response => {
                if (response.ok) {
                  return response.text();
                }
                throw new Error('Form submission failed');
              })
              .then(html => {
                // Replace current document with response
                document.open();
                document.write(html);
                document.close();
              })
              .catch(error => {
                console.error('❌ Form submission error:', error);
                alert('Failed to submit form. Please try again.');
              });
            }
          }
        });
      </script>`)
    // Add inline styles to ensure basic styling works
    .replace(/<head>/i, `<head>
      <style>
        /* Basic fallback styles */
        html, body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: #f8fafc;
        }
        
        * {
          box-sizing: border-box;
        }
        
        /* Block problematic font loading */
        @font-face {
          font-family: 'FFF-AcidGrotesk-Bold';
          src: none !important;
        }
        
        /* Override any font-face declarations */
        @font-face {
          font-display: none !important;
        }
      </style>`);
}

// GET handler
export async function GET(request: NextRequest) {
  try {
    const { companySlug, targetUrl } = extractTargetUrl(request);
    
    console.log('Review proxy GET request for URL:', targetUrl);
    console.log('Company slug:', companySlug);
    
    if (!targetUrl) {
      console.log('No URL parameter or company slug provided');
      return NextResponse.json({ error: 'URL parameter or company slug is required' }, { status: 400 });
    }

    // Validate that it's a whop.com URL for security
    if (!targetUrl.includes('whop.com')) {
      console.log('Invalid URL - not whop.com:', targetUrl);
      return NextResponse.json({ error: 'Only whop.com URLs are allowed' }, { status: 400 });
    }

    console.log('Fetching content from:', targetUrl);

    // Fetch the content from the target URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);

    console.log('Response status:', response.status);

    if (!response.ok) {
      console.log('Failed to fetch content, status:', response.status);
      return NextResponse.json({ 
        error: `Failed to fetch content: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    const html = await response.text();
    console.log('HTML content length:', html.length);
    
    // Modify the HTML to work within our iframe
    const modifiedHtml = modifyHtmlForIframe(html, companySlug);

    console.log('Modified HTML length:', modifiedHtml.length);

    // Return the modified HTML with proper headers
    return new NextResponse(modifiedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *;',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Review proxy GET error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy review page',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST handler for form submissions
export async function POST(request: NextRequest) {
  try {
    const { companySlug, targetUrl } = extractTargetUrl(request);
    
    console.log('Review proxy POST request for URL:', targetUrl);
    console.log('Company slug:', companySlug);
    
    if (!targetUrl) {
      console.log('No URL parameter or company slug provided');
      return NextResponse.json({ error: 'URL parameter or company slug is required' }, { status: 400 });
    }

    // Validate that it's a whop.com URL for security
    if (!targetUrl.includes('whop.com')) {
      console.log('Invalid URL - not whop.com:', targetUrl);
      return NextResponse.json({ error: 'Only whop.com URLs are allowed' }, { status: 400 });
    }

    // Get request body and content type
    const contentType = request.headers.get('content-type') || '';
    let body: FormData | URLSearchParams | string | null = null;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'no-cache',
      'Referer': targetUrl,
    };
    
    // Handle different content types
    if (contentType.includes('multipart/form-data')) {
      try {
        body = await request.formData();
        // Don't set Content-Type header - let fetch set it with boundary
      } catch (error) {
        console.log('⚠️ Could not parse multipart form data, trying as text:', error);
        body = await request.text();
        headers['Content-Type'] = contentType;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await request.formData();
        const urlParams = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
          urlParams.append(key, value.toString());
        }
        body = urlParams;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } catch (error) {
        console.log('⚠️ Could not parse form-urlencoded data, trying as text:', error);
        body = await request.text();
        headers['Content-Type'] = contentType;
      }
    } else if (contentType.includes('application/json')) {
      body = await request.text();
      headers['Content-Type'] = 'application/json';
    } else {
      // Try to get as text for other content types or no content type
      try {
        const text = await request.text();
        if (text) {
          body = text;
          if (contentType) {
            headers['Content-Type'] = contentType;
          }
        }
      } catch (error) {
        console.log('⚠️ Could not read request body:', error);
        body = null;
      }
    }
    
    console.log('Proxying POST request to:', targetUrl);
    console.log('Content-Type:', contentType);
    console.log('Body type:', body instanceof FormData ? 'FormData' : body instanceof URLSearchParams ? 'URLSearchParams' : typeof body);

    // Fetch the content from the target URL with POST method
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      body: body as BodyInit,
      headers,
    });
    
    clearTimeout(timeoutId);

    console.log('POST Response status:', response.status);

    if (!response.ok) {
      console.log('Failed to POST content, status:', response.status);
      return NextResponse.json({ 
        error: `Failed to submit form: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    const html = await response.text();
    console.log('POST HTML content length:', html.length);
    
    // Modify the HTML to work within our iframe
    const modifiedHtml = modifyHtmlForIframe(html, companySlug);

    console.log('POST Modified HTML length:', modifiedHtml.length);

    // Return the modified HTML with proper headers
    return new NextResponse(modifiedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *;',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Review proxy POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy form submission',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
