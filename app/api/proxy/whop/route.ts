import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    
    console.log('Proxy request for URL:', targetUrl);
    
    if (!targetUrl) {
      console.log('No URL parameter provided');
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
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
    
    // Modify the HTML to work within our iframe - simplified approach
    const modifiedHtml = html
      // Remove X-Frame-Options meta tags
      .replace(/<meta[^>]*http-equiv="X-Frame-Options"[^>]*>/gi, '')
      // Remove Content-Security-Policy frame-ancestors
      .replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*frame-ancestors[^>]*>/gi, '')
      // Add base tag to ensure proper resource loading
      .replace(/<head>/i, '<head><base href="https://whop.com/">')
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
          
          // Handle product clicks - open in new window
          document.addEventListener('click', function(e) {
            const target = e.target.closest('a');
            if (target && target.href) {
              const url = new URL(target.href);
              // If it's a product page or external link, open in new window
              if (url.pathname.includes('/products/') || 
                  url.pathname.includes('/profit-pulse-ai/') ||
                  url.hostname !== 'whop.com') {
                e.preventDefault();
                window.open(target.href, '_blank', 'noopener,noreferrer');
              }
            }
          });
          
          // Auto-scroll reveal functionality
          let scrollProgress = 0;
          let isAutoScrolling = false;
          
          function startAutoScroll() {
            if (isAutoScrolling) return;
            
            console.log('Starting auto-scroll function');
            console.log('Document ready state:', document.readyState);
            console.log('Document height:', document.documentElement.scrollHeight);
            console.log('Window height:', window.innerHeight);
            console.log('Body height:', document.body.scrollHeight);
            
            isAutoScrolling = true;
            
            // Start from top
            window.scrollTo(0, 0);
            
            // Instead of creating scrollbars, let's create a reveal effect by animating content
            console.log('Creating content reveal animation instead of scroll');
            
            // Find all visible elements and create a reveal animation
            const elements = document.querySelectorAll('*');
            const visibleElements = Array.from(elements).filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && 
                     rect.top >= 0 && rect.top < window.innerHeight;
            });
            
            console.log('Found', visibleElements.length, 'visible elements to animate');
            
            // Animate elements from top to bottom
            visibleElements.forEach((element, index) => {
              const delay = (index / visibleElements.length) * 4000; // Spread over 4 seconds
              
              // Initially hide element
              (element as HTMLElement).style.opacity = '0';
              (element as HTMLElement).style.transform = 'translateY(20px)';
              (element as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease';
              
              // Reveal element with delay
              setTimeout(() => {
                (element as HTMLElement).style.opacity = '1';
                (element as HTMLElement).style.transform = 'translateY(0)';
              }, delay);
            });
            
            // Also try a subtle scroll effect if content is scrollable
            const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            if (maxScroll > 0) {
              console.log('Content is scrollable, adding scroll animation');
              
              const duration = 4000; // 4 seconds
              const startTime = Date.now();
              
              function animateScroll() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const targetScroll = maxScroll * progress;
                
                console.log('Scroll progress:', progress, 'Target scroll:', targetScroll);
                
                // Scroll to position
                window.scrollTo({
                  top: targetScroll,
                  left: 0,
                  behavior: 'smooth'
                });
                
                if (progress < 1) {
                  requestAnimationFrame(animateScroll);
                } else {
                  isAutoScrolling = false;
                  console.log('Auto-scroll completed');
                }
              }
              
              requestAnimationFrame(animateScroll);
            } else {
              // No scrollable content, just do the reveal animation
              setTimeout(() => {
                isAutoScrolling = false;
                console.log('Content reveal animation completed');
              }, 4000);
            }
          }
          
          // Listen for messages from parent window to start auto-scroll
          window.addEventListener('message', function(event) {
            console.log('Received message in iframe:', event.data);
            console.log('Message type:', typeof event.data);
            console.log('Message origin:', event.origin);
            
            if (event.data === 'startAutoScroll' || 
                (typeof event.data === 'object' && event.data.type === 'startAutoScroll')) {
              console.log('Starting auto-scroll in iframe');
              startAutoScroll();
            }
          });
          
          // Auto-start scroll immediately when iframe loads
          console.log('Iframe loaded, starting auto-scroll immediately');
          console.log('Document height:', document.documentElement.scrollHeight);
          console.log('Window height:', window.innerHeight);
          console.log('Document ready state:', document.readyState);
          
          // Start scroll immediately
          setTimeout(function() {
            console.log('Auto-starting scroll in iframe immediately');
            startAutoScroll();
          }, 500); // Start after 0.5 seconds to ensure content is loaded
          
          // Additional fallback - start scroll when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              console.log('DOM content loaded, starting auto-scroll');
              setTimeout(startAutoScroll, 200);
            });
          } else {
            console.log('DOM already loaded, starting auto-scroll immediately');
            setTimeout(startAutoScroll, 200);
          }
          
          // Add manual test button for debugging
          setTimeout(function() {
            const testButton = document.createElement('button');
            testButton.textContent = 'Test Scroll';
            testButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
            testButton.onclick = function() {
              console.log('Manual scroll test triggered');
              console.log('Button clicked - starting scroll test');
              startAutoScroll();
            };
            document.body.appendChild(testButton);
            
            // Add a simple scroll indicator
            const scrollIndicator = document.createElement('div');
            scrollIndicator.id = 'scroll-indicator';
            scrollIndicator.style.cssText = 'position: fixed; top: 50px; right: 10px; z-index: 9999; background: blue; color: white; padding: 5px; border-radius: 3px; font-size: 12px;';
            scrollIndicator.textContent = 'Scroll: 0px';
            document.body.appendChild(scrollIndicator);
            
            // Update scroll indicator
            let lastScrollY = 0;
            function updateScrollIndicator() {
              const currentScrollY = window.scrollY;
              if (currentScrollY !== lastScrollY) {
                scrollIndicator.textContent = 'Scroll: ' + Math.round(currentScrollY) + 'px';
                lastScrollY = currentScrollY;
              }
              requestAnimationFrame(updateScrollIndicator);
            }
            updateScrollIndicator();
          }, 1000);
          
          // Handle load timeouts
          setTimeout(function() {
            if (document.readyState !== 'complete') {
              console.log('Page load timeout, showing fallback');
            }
          }, 10000);
        </script>`)
             // Add inline styles to ensure basic styling works and prevent scrollbars
             .replace(/<head>/i, `<head>
               <style>
                 /* Basic fallback styles */
                 html, body { 
                   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                   margin: 0;
                   padding: 0;
                   background: #f8fafc;
                   overflow: hidden !important;
                   height: 100% !important;
                   width: 100% !important;
                 }
                 
                 /* Prevent any scrollbars in the iframe */
                 * {
                   box-sizing: border-box;
                 }
                 
                 /* Ensure content fits within iframe */
                 body {
                   max-height: 100vh !important;
                   overflow: hidden !important;
                 }
                 
                 .loading { 
                   display: flex; 
                   align-items: center; 
                   justify-content: center; 
                   height: 100vh; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                   color: white;
                   font-size: 18px;
                 }
                 
                 /* Hide any existing scrollbars */
                 ::-webkit-scrollbar {
                   display: none;
                 }
                 
                 /* For Firefox */
                 html {
                   scrollbar-width: none;
                 }
               </style>`);

    console.log('Modified HTML length:', modifiedHtml.length);

    // Return the modified HTML with proper headers
    return new NextResponse(modifiedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *;",
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
