import { Inter } from "next/font/google";
import "frosted-ui/styles.css";
import "./globals.css";
import { ThemeProvider } from "@/lib/components/common/ThemeProvider";
import { WhopIframeSdkProvider } from "@whop/react";
import { DynamicWebsocketProvider } from "@/lib/components/DynamicWebsocketProvider";

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
              })();
            `,
					}}
				/>
			</head>
			<body>
				<WhopIframeSdkProvider>
					<ThemeProvider>
						<DynamicWebsocketProvider>
							{children}
						</DynamicWebsocketProvider>
					</ThemeProvider>
				</WhopIframeSdkProvider>
			</body>
		</html>
	);
}
