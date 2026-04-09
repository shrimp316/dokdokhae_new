import { Noto_Serif_KR, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';

const notoSerif = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif' });
const notoSans = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-sans' });

export const metadata = {
  title: '너 참 독독하다',
  description: '우리 독서모임',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '독독하다',
  },
  icons: {
    apple: '/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${notoSerif.variable} ${notoSans.variable}`}>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-wrapper">
              <Header />
              <main className="main-content">
                {children}
              </main>
            </div>
          </div>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
