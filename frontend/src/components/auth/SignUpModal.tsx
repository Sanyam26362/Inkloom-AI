"use client";

import React, { useState } from "react";
import { SignUp, SignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/types";
import { useAppContext } from "@/context/AppContext";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
}

export function SignUpModal({ isOpen, onClose, initialRole }: SignUpModalProps) {
  const router = useRouter();
  const { loginAsDemoUser, theme } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<"REVIEWER" | "CREATOR" | "ADMIN" | null>(
    initialRole === "CREATOR" ? "CREATOR" : initialRole === "ADMIN" ? "ADMIN" : initialRole === "REVIEWER" ? "REVIEWER" : null
  );
  const [authMode, setAuthMode] = useState<"choose_role" | "signup" | "signin">("choose_role");
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  if (!isOpen) return null;

  const handleSelectRole = (role: "REVIEWER" | "CREATOR" | "ADMIN") => {
    setSelectedRole(role);
    setAuthMode("signup");
  };

  const handleFastSignup = async (role: UserRole) => {
    setLoadingRole(role);
    try {
      await loginAsDemoUser(role);
      onClose();
      if (role === "REVIEWER") {
        router.push("/setup");
      } else if (role === "CREATOR") {
        router.push("/content");
      } else {
        router.push("/judge");
      }
    } catch (err) {
      console.error("Fast signup failed:", err);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden z-10 my-8 transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-palette-7/30">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">verified_user</span>
            <span className="font-sans font-bold text-sm tracking-tight text-on-surface">
              Inkloom AI Gateway
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-on-surface hover:bg-palette-7/60 transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8">
          {authMode === "choose_role" && (
            <div className="space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                  Get Started with Inkloom AI
                </h2>
                <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto">
                  Select your role to access multi-modal brand governance, guideline verification, and automated pre-flight checks.
                </p>
              </div>

              {/* 3 Role Options */}
              <div className="grid grid-cols-1 gap-4 pt-2">
                {/* 1. As Brand */}
                <div className="group relative p-4.5 rounded-2xl border-2 border-border hover:border-primary/80 bg-palette-7/20 transition-all duration-200 text-left shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[26px]">shield</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm font-sans text-on-surface">
                          Brand / Compliance Officer
                        </span>
                        <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                          Brand Manager
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed mb-3">
                        Upload brand guidelines, configure rulesets, override model findings, and approve/reject creator submissions.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleFastSignup("REVIEWER")}
                          disabled={loadingRole !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-[#004578] text-white text-xs font-bold font-sans shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Fast Signup for Hackathon
                          {loadingRole === "REVIEWER" && (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectRole("REVIEWER")}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border hover:border-primary/60 text-on-surface hover:text-primary text-xs font-semibold font-sans transition-colors cursor-pointer"
                        >
                          Sign Up with Clerk
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. As Creator */}
                <div className="group relative p-4.5 rounded-2xl border-2 border-border hover:border-emerald-500/80 bg-palette-7/20 transition-all duration-200 text-left shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm font-sans text-on-surface">
                          Content Creator (Blinkit Demo)
                        </span>
                        <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          Creator Studio
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed mb-3">
                        Upload copy, banners, audio voiceovers, and video reels for Blinkit Diwali campaign with pre-flight policy verification.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleFastSignup("CREATOR")}
                          disabled={loadingRole !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-sans shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Fast Signup for Hackathon
                          {loadingRole === "CREATOR" && (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectRole("CREATOR")}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border hover:border-emerald-500/60 text-on-surface hover:text-emerald-600 text-xs font-semibold font-sans transition-colors cursor-pointer"
                        >
                          Sign Up with Clerk
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. As Admin / Judge */}
                <div className="group relative p-4.5 rounded-2xl border-2 border-amber-500/40 hover:border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 transition-all duration-200 text-left shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[26px]">gavel</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm font-sans text-on-surface">
                          Judge / Admin Sandbox (1-Click)
                        </span>
                        <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-300">
                          Zero Friction
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed mb-3">
                        Instant evaluation access pre-loaded with Blinkit Diwali 2026 guidelines, full override authority, and Judge Canvas.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleFastSignup("ADMIN")}
                          disabled={loadingRole !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-sans shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Fast Signup for Hackathon
                          {loadingRole === "ADMIN" && (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectRole("ADMIN")}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border hover:border-amber-500/60 text-on-surface hover:text-amber-600 text-xs font-semibold font-sans transition-colors cursor-pointer"
                        >
                          Sign Up with Clerk
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing Account Footer */}
              <div className="pt-2 text-center text-xs text-text-muted">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Sign in to existing account
                </button>
              </div>
            </div>
          )}

          {/* Clerk SignUp View */}
          {authMode === "signup" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {selectedRole === "REVIEWER" ? "shield" : selectedRole === "ADMIN" ? "gavel" : "auto_awesome"}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">
                      {selectedRole === "REVIEWER"
                        ? "Brand Manager Sign Up"
                        : selectedRole === "ADMIN"
                        ? "Judge / Admin Sign Up"
                        : "Content Creator Sign Up"}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Role:{" "}
                      <span className="font-semibold text-primary">
                        {selectedRole === "REVIEWER"
                          ? "Brand Reviewer"
                          : selectedRole === "ADMIN"
                          ? "Judge / Admin"
                          : "Content Creator"}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode("choose_role")}
                  className="text-xs text-text-muted hover:text-on-surface flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Change Role
                </button>
              </div>

              <div className="flex justify-center py-2">
                <SignUp
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0 bg-transparent w-full",
                    },
                  }}
                  unsafeMetadata={{
                    role: selectedRole || "CREATOR",
                  }}
                  fallbackRedirectUrl={
                    selectedRole === "REVIEWER"
                      ? "/setup"
                      : selectedRole === "CREATOR"
                      ? "/content"
                      : "/judge"
                  }
                  signInUrl="#signin"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </div>
          )}

          {/* Clerk SignIn View */}
          {authMode === "signin" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-bold text-sm text-on-surface">Sign In to Inkloom</h3>
                <button
                  type="button"
                  onClick={() => setAuthMode("choose_role")}
                  className="text-xs text-text-muted hover:text-on-surface flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Roles
                </button>
              </div>

              <div className="flex justify-center py-2">
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0 bg-transparent w-full",
                    },
                  }}
                  signUpUrl="#signup"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

