'use client';

import React from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans relative">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-32 lg:pb-8 space-y-6 min-h-screen">
        {children}
      </main>
    </div>
  );
}
