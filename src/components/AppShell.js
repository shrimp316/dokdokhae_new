'use client';

import Sidebar from '@/components/Sidebar';
import SidebarTab from '@/components/SidebarTab';
import Header from '@/components/Header';
import { useTheme } from '@/lib/ThemeContext';

export default function AppShell({ children }) {
  const { isOpen, isMobile, setSidebar } = useTheme();

  return (
    <div className="app-layout" data-sidebar={isOpen ? 'open' : 'closed'}>
      {isMobile && isOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setSidebar(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar />
      <SidebarTab />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
