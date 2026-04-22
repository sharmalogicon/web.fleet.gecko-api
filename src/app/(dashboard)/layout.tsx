'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useUIStore } from '@/lib/stores/useUIStore';
import { cn } from '@/lib/utils/cn';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-w-0",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
