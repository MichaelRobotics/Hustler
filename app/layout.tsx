import { Inter } from "next/font/google";
import "frosted-ui/styles.css";
import "./globals.css";
import { ThemeProvider } from "@/lib/components/common/ThemeProvider";
import { WhopIframeSdkProvider } from "@whop/react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.className}>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var finalTheme = theme || (systemPrefersDark ? 'dark' : 'light');
                  
                  if (finalTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
                
                // Suppress WebSocket connection errors from WhopIframeSdkProvider
                // These are expected failures since WebSocket is disabled
                if (typeof window !== 'undefined') {
                  // Suppress console.error - must be set early before any WebSocket code runs
                  const originalError = console.error;
                  console.error = function(...args) {
                    try {
                      const message = args.map(arg => {
                        if (typeof arg === 'string') return arg;
                        if (arg && typeof arg === 'object') {
                          try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                        }
                        return String(arg);
                      }).join(' ');
                      
                      // Suppress all WebSocket-related errors
                      if (message.includes('WebSocket') || 
                          message.includes('websocket') || 
                          message.includes('WhopWebsocketClient') ||
                          message.includes('wss://')) {
                        return; // Suppress these errors
                      }
                    } catch(e) {}
                    originalError.apply(console, args);
                  };
                  
                  // Suppress console.warn for WebSocket warnings
                  const originalWarn = console.warn;
                  console.warn = function(...args) {
                    try {
                      const message = args.map(arg => {
                        if (typeof arg === 'string') return arg;
                        if (arg && typeof arg === 'object') {
                          try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                        }
                        return String(arg);
                      }).join(' ');
                      if (message.includes('WebSocket') || message.includes('websocket') || message.includes('wss://')) {
                        return; // Suppress WebSocket warnings
                      }
                    } catch(e) {}
                    originalWarn.apply(console, args);
                  };
                  
                  // Intercept WebSocket creation to prevent error logging
                  const OriginalWebSocket = window.WebSocket;
                  window.WebSocket = function(url, protocols) {
                    try {
                      const ws = new OriginalWebSocket(url, protocols);
                      
                      // Override onerror to prevent error logging
                      const originalOnError = ws.onerror;
                      ws.onerror = function(event) {
                        // Suppress error - don't call original handler
                        return false;
                      };
                      
                      // Override addEventListener for error events
                      const originalAddEventListener = ws.addEventListener.bind(ws);
                      ws.addEventListener = function(type, listener, options) {
                        if (type === 'error') {
                          // Don't add error listeners - suppress them
                          return;
                        }
                        return originalAddEventListener(type, listener, options);
                      };
                      
                      return ws;
                    } catch(e) {
                      // If WebSocket creation fails, return a mock WebSocket
                      return {
                        readyState: 3, // CLOSED
                        close: function() {},
                        send: function() {},
                        addEventListener: function() {},
                        removeEventListener: function() {},
                        onerror: null,
                        onopen: null,
                        onclose: null,
                        onmessage: null
                      };
                    }
                  };
                  
                  // Copy static properties
                  Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
                  Object.setPrototypeOf(window.WebSocket.prototype, OriginalWebSocket.prototype);
                  window.WebSocket.CONNECTING = 0;
                  window.WebSocket.OPEN = 1;
                  window.WebSocket.CLOSING = 2;
                  window.WebSocket.CLOSED = 3;
                }
              })();
            `,
					}}
				/>
			</head>
			<body>
				<WhopIframeSdkProvider>
					<ThemeProvider>
						{children}
					</ThemeProvider>
				</WhopIframeSdkProvider>
			</body>
		</html>
	);
}
