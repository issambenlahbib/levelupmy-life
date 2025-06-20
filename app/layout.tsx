import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '../components/ui/theme-provider';
import { AuthProvider } from '../components/contexts/auth-context'; // Import the AuthProvider

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'My App',
  description: 'Description...',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable} suppressHydrationWarning>
        <AuthProvider> {/* Wrap everything with AuthProvider */}
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}