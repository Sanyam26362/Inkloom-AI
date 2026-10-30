"use client";

import React from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  const role =
    typeof window !== "undefined"
      ? (localStorage.getItem("inkloom_signup_role") || localStorage.getItem("inkloom_role") || "").toUpperCase()
      : "";
  const ssoDestination =
    role === "REVIEWER" || role === "MANAGER" || role === "BRAND"
      ? "/setup?step=1"
      : role === "CREATOR"
      ? "/content"
      : "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#101010] text-[#f5f0e7] font-mono">
      <div className="w-full max-w-md p-6 border-4 border-black bg-[#1c1d22] shadow-[8px_8px_0px_#000] text-center">
        <div className="w-14 h-14 border-3 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000] animate-spin">
          <span className="material-symbols-outlined text-[32px]">sync</span>
        </div>
        <h2 className="font-archivo font-black text-lg uppercase tracking-tight mb-2">
          Completing Single Sign-On
        </h2>
        <p className="text-xs font-mono text-[#888] leading-relaxed mb-6">
          Finalizing authentication handshake and securely synchronizing workspace identity...
        </p>

        <div className="flex justify-center">
          <AuthenticateWithRedirectCallback
            signInFallbackRedirectUrl={ssoDestination}
            signUpFallbackRedirectUrl={ssoDestination}
            signInForceRedirectUrl={ssoDestination}
            signUpForceRedirectUrl={ssoDestination}
          />
        </div>

        <div className="w-full bg-white/10 h-2 border border-black overflow-hidden mt-6">
          <div className="bg-[var(--green)] h-full w-2/3 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
