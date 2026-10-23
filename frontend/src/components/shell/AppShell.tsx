"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  if (isLandingPage) {
    return (
      <div className="min-h-screen w-full bg-white text-gray-900 overflow-x-hidden selection:bg-[#ffe29f] selection:text-[#111827]">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <Sidebar />
      <div className="pl-0 lg:pl-72 flex flex-col flex-1 min-w-0">
        <Header />
        <main className="relative pt-16 flex-1 w-full bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
