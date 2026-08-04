'use client';

import Navbar from '@/components/Navbar';
import Header from '@/components/Header';

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
