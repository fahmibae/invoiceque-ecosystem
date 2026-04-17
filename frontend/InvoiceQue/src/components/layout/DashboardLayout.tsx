'use client';

import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-content">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
