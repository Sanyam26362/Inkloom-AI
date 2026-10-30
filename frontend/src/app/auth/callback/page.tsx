"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { resolvePostAuthRedirect } from "@/lib/auth-resolver";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, theme } = useApp();
  const isDark = theme === "dark";

  useEffect(() => {
    if (user) {
      const destination = resolvePostAuthRedirect(user);
      router.replace(destination);
    }
  }, [user, router]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-6 font-mono ${
        isDark ? "bg-[#101010] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      <div
        className={`w-full max-w-md p-6 border-4 border-black shadow-[8px_8px_0px_#000] text-center ${
          isDark ? "bg-[#1c1d22]" : "bg-white"
        }`}
      >
        <div className="w-14 h-14 border-3 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000] animate-spin">
          <span className="material-symbols-outlined text-[32px]">sync</span>
        </div>
        <h2 className="font-archivo font-black text-lg uppercase tracking-tight mb-2">
          Resolving Workspace Identity
        </h2>
        <p className="text-xs font-mono text-[#666] dark:text-[#888] leading-relaxed mb-4">
          Synchronizing role credentials, brand tenancy, and onboarding state...
        </p>
        <div className="w-full bg-black/10 dark:bg-white/10 h-2 border border-black overflow-hidden">
          <div className="bg-[var(--green)] h-full w-2/3 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

