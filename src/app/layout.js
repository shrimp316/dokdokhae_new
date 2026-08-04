import { Noto_Serif_KR, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppShell from '@/components/AppShell';
import AuthModal from '@/components/AuthModal';
import FCMInit from '@/components/FCMInit';
import VersionGate from '@/components/VersionGate';

const notoSerif = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-serif' });
const notoSans = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-sans' });

export const metadata = {
  metadataBase: new URL('https://dokdokhae.vercel.app'),
  title: '너 참 독독하다',
  description: '우리 독서모임',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
  openGraph: {
    title: '너 참 독독하다',
    description: '우리 독서모임',
    siteName: '너 참 독독하다',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '너 참 독독하다',
    description: '우리 독서모임',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" data-mode="white" className={`${notoSerif.variable} ${notoSans.variable}`}>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            <AuthModal />
            <FCMInit />
            <VersionGate />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
