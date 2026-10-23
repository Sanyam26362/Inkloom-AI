"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useApp();
  const isLandingPage = pathname === "/";
  const isDark = theme === "dark";

  if (isLandingPage) {
    return (
      <div
        className={`landing-scope min-h-screen w-full overflow-x-hidden selection:bg-accent selection:text-equally-action-color transition-colors duration-200 ${
          isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-background text-text-primary"
        }`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen w-full font-sans transition-colors duration-200 ${
        isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#111827]"
      }`}
    >
      <Sidebar />
      <div
        className={`pl-0 lg:pl-72 flex flex-col flex-1 min-w-0 transition-colors duration-200 ${
          isDark ? "bg-[#121316]" : "bg-[#f8fafc]"
        }`}
      >
        <Header />
        <main
          className={`relative pt-16 flex-1 w-full transition-colors duration-200 ${
            isDark ? "bg-[#121316]" : "bg-[#f8fafc]"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
