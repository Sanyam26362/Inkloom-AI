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
      <div className="landing-scope min-h-screen w-full bg-background text-text-primary overflow-x-hidden selection:bg-accent selection:text-equally-action-color">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-surface text-on-surface">
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
