import { Inter } from "next/font/google";
import 'frosted-ui/styles.css';
import "./globals.css";
import { ThemeProvider } from '@/lib/components/common/ThemeProvider';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}