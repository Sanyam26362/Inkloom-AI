"use client";

import React, { useState, useEffect } from "react";
import { SignUp, SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/types";
import { useAppContext } from "@/context/AppContext";
import { resolvePostAuthRedirect } from "@/lib/auth-resolver";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
}

export function SignUpModal({ isOpen, onClose, initialRole }: SignUpModalProps) {
  const router = useRouter();
  const { loginAsDemoUser, theme } = useAppContext();
  const isDark = theme === "dark";

  const [selectedRole, setSelectedRole] = useState<"REVIEWER" | "CREATOR" | "ADMIN" | null>(
    initialRole === "CREATOR" ? "CREATOR" : initialRole === "ADMIN" ? "ADMIN" : initialRole === "REVIEWER" ? "REVIEWER" : null
  );
  const [authMode, setAuthMode] = useState<"choose_role" | "signup" | "signin">("choose_role");
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  // Sync initialRole if updated when modal is opened
  useEffect(() => {
    if (initialRole) {
      if (initialRole === "CREATOR" || initialRole === "ADMIN" || initialRole === "REVIEWER") {
        setSelectedRole(initialRole);
      } else if (initialRole === "JUDGE") {
        setSelectedRole("ADMIN");
      }
    }
  }, [initialRole]);

  // Keyboard accessibility: Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectRole = (role: "REVIEWER" | "CREATOR" | "ADMIN") => {
    setSelectedRole(role);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("inkloom_signup_role", role);
        localStorage.setItem("inkloom_role", role);
      } catch {}
    }
    setAuthMode("signup");
  };

  const handleFastSignup = async (role: UserRole) => {
    setLoadingRole(role);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("inkloom_signup_role", role);
        localStorage.setItem("inkloom_role", role);
      } catch {}
    }
    try {
      const loggedInUser = await loginAsDemoUser(role);
      onClose();
      if (role === "REVIEWER" || role === "MANAGER") {
        router.push("/setup?step=1");
        return;
      }
      const targetDestination = resolvePostAuthRedirect(loggedInUser);
      router.push(targetDestination);
    } catch (err) {
      console.error("Fast signup failed:", err);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="brandlens-scope fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-mono">
      {/* Backdrop with accessible dismissal */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Neo-Brutalist Modal Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className={`relative w-full max-w-2xl border-4 ${
          isDark
            ? "border-[#383a45] bg-[#141518] shadow-[8px_8px_0px_#000000]"
            : "border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0px_#101010]"
        } z-10 my-8 transition-all`}
      >
        {/* Window Title Bar */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b-4 ${
            isDark
              ? "bg-[#1c1d22] border-[#383a45] text-[#f5f0e7]"
              : "bg-[var(--ink)] border-[var(--ink)] text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 bg-[var(--yellow)] border border-black inline-block shrink-0" />
            <span className="w-3 h-3 bg-[var(--green)] border border-black inline-block shrink-0" />
            <span className="w-3 h-3 bg-[var(--pink)] border border-black inline-block shrink-0" />
            <span className="text-xs font-mono font-black tracking-wider uppercase ml-1.5">
              <span className="normal-case">BrandLens</span> // GATEWAY_AUTH.EXE
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 bg-[var(--red)] text-white border-2 border-black font-mono font-black text-xs flex items-center justify-center shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Modal Window Canvas */}
        <div className={`p-5 sm:p-7 ${isDark ? "text-[#f5f0e7]" : "text-[var(--ink)]"}`}>
          {/* Mode 1: Role Selection & 1-Click Fast Auth */}
          {authMode === "choose_role" && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="inline-block px-2 py-0.5 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] text-[10px] font-mono font-black uppercase tracking-wider mb-1 shadow-[2px_2px_0px_#000]">
                  SYS_PROMPT: MULTI-MODAL GOVERNANCE GATEWAY
                </div>
                <h2
                  id="auth-modal-title"
                  className="text-xl sm:text-2xl font-black font-archivo tracking-tight uppercase"
                >
                  Get Started with BrandLens
                </h2>
                <p className="text-xs font-mono leading-relaxed text-[#555] dark:text-[#a0a5b5]">
                  Select your authorization role to access brand ruleset ingestion, pre-flight campaign checks, and automated compliance auditing.
                </p>
              </div>

              {/* 3 Neo-Brutalist Role Cards */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                {/* 1. Brand / Compliance Officer (REVIEWER) */}
                <div
                  className={`p-4 sm:p-5 border-3 ${
                    isDark
                      ? "border-[#383a45] bg-[#1c1d22] shadow-[4px_4px_0px_#000000]"
                      : "border-[var(--ink)] bg-[#fffdf7] shadow-[4px_4px_0px_#101010]"
                  } text-left transition-transform`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 border-2 border-black bg-[var(--blue)] flex items-center justify-center text-[var(--ink)] shadow-[2px_2px_0px_#000] shrink-0">
                      <span className="material-symbols-outlined text-[24px]">shield</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono font-black text-sm tracking-tight text-[var(--ink)] dark:text-white uppercase">
                          Brand / Compliance Officer
                        </span>
                        <span className="text-[10px] font-mono font-black tracking-wider uppercase px-2 py-0.5 border border-black bg-[var(--blue)] text-[var(--ink)] shadow-[1px_1px_0px_#000]">
                          Brand Manager
                        </span>
                      </div>

                      <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-3.5">
                        Upload brand guidelines, configure rulesets, override model findings, and approve/reject creator submissions.
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleFastSignup("REVIEWER")}
                          disabled={loadingRole !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Fast Signup for Hackathon
                          {loadingRole === "REVIEWER" && (
                            <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectRole("REVIEWER")}
                          className="inline-flex items-center gap-1 px-3 py-2 border-2 border-black bg-white dark:bg-[#25262c] text-[var(--ink)] dark:text-[#f5f0e7] text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
                        >
                          Sign Up with Clerk →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Content Creator (CREATOR) */}
                <div
                  className={`p-4 sm:p-5 border-3 ${
                    isDark
                      ? "border-[#383a45] bg-[#1c1d22] shadow-[4px_4px_0px_#000000]"
                      : "border-[var(--ink)] bg-[#fffdf7] shadow-[4px_4px_0px_#101010]"
                  } text-left transition-transform`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 border-2 border-black bg-[var(--green)] flex items-center justify-center text-[var(--ink)] shadow-[2px_2px_0px_#000] shrink-0">
                      <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono font-black text-sm tracking-tight text-[var(--ink)] dark:text-white uppercase">
                          Content Creator (Blinkit Demo)
                        </span>
                        <span className="text-[10px] font-mono font-black tracking-wider uppercase px-2 py-0.5 border border-black bg-[var(--green)] text-[var(--ink)] shadow-[1px_1px_0px_#000]">
                          Creator Studio
                        </span>
                      </div>

                      <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-3.5">
                        Upload copy, banners, audio voiceovers, and video reels for Blinkit Diwali campaign with pre-flight policy verification.
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleFastSignup("CREATOR")}
                          disabled={loadingRole !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-black bg-[var(--green)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Fast Signup for Hackathon
                          {loadingRole === "CREATOR" && (
                            <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectRole("CREATOR")}
                          className="inline-flex items-center gap-1 px-3 py-2 border-2 border-black bg-white dark:bg-[#25262c] text-[var(--ink)] dark:text-[#f5f0e7] text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
                        >
                          Sign Up with Clerk →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Judge / Admin Sandbox (ADMIN) */}
                <div
                  className={`p-4 sm:p-5 border-3 ${
                    isDark
                      ? "border-[#383a45] bg-[#1c1d22] shadow-[4px_4px_0px_#000000]"
                      : "border-[var(--ink)] bg-[#fffdf7] shadow-[4px_4px_0px_#101010]"
                  } text-left transition-transform`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 border-2 border-black bg-[var(--pink)] flex items-center justify-center text-[var(--ink)] shadow-[2px_2px_0px_#000] shrink-0">
                      <span className="material-symbols-outlined text-[24px]">gavel</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono font-black text-sm tracking-tight text-[var(--ink)] dark:text-white uppercase">
                          Judge / Admin Sandbox (1-Click)
                        </span>
                        <span className="text-[10px] font-mono font-black tracking-wider uppercase px-2 py-0.5 border border-black bg-[var(--pink)] text-[var(--ink)] shadow-[1px_1px_0px_#000]">
                          Zero Friction
                        </span>
                      </div>

                      <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-3.5">
                        Instant evaluation access pre-loaded with Blinkit Diwali 2026 guidelines, full override authority, and Judge Canvas.
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleFastSignup("ADMIN")}
                          disabled={loadingRole !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-black bg-[var(--pink)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Fast Signup for Hackathon
                          {loadingRole === "ADMIN" && (
                            <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectRole("ADMIN")}
                          className="inline-flex items-center gap-1 px-3 py-2 border-2 border-black bg-white dark:bg-[#25262c] text-[var(--ink)] dark:text-[#f5f0e7] text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
                        >
                          Sign Up with Clerk →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Footer & Existing Account Link */}
              <div
                className={`pt-4 border-t-2 ${
                  isDark ? "border-[#383a45]" : "border-[var(--ink)]"
                } flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono`}
              >
                <div className="flex items-center gap-2 text-[#666] dark:text-[#999]">
                  <span className="w-2 h-2 bg-[var(--green)] border border-black inline-block" />
                  <span>SYS: HACKATHON EVALUATION READY</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#666] dark:text-[#999]">ALREADY REGISTERED?</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className="border-2 border-black bg-[var(--yellow)] text-[var(--ink)] px-2.5 py-1 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer transition-all"
                  >
                    SIGN IN WITH CLERK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Clerk SignUp View */}
          {authMode === "signup" && (
            <div className="space-y-4">
              <div
                className={`flex items-center justify-between pb-3 border-b-2 ${
                  isDark ? "border-[#383a45]" : "border-[var(--ink)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 border-2 border-black flex items-center justify-center ${
                      selectedRole === "REVIEWER"
                        ? "bg-[var(--blue)]"
                        : selectedRole === "ADMIN"
                        ? "bg-[var(--pink)]"
                        : "bg-[var(--green)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-black">
                      {selectedRole === "REVIEWER" ? "shield" : selectedRole === "ADMIN" ? "gavel" : "auto_awesome"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-mono font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                      {selectedRole === "REVIEWER"
                        ? "Brand Manager Sign Up"
                        : selectedRole === "ADMIN"
                        ? "Judge / Admin Sign Up"
                        : "Content Creator Sign Up"}
                    </h3>
                    <p className="text-[10px] font-mono text-[#666] dark:text-[#999]">
                      CONFIGURED ROLE:{" "}
                      <span className="font-black text-[var(--ink)] dark:text-white">
                        {selectedRole === "REVIEWER"
                          ? "BRAND REVIEWER"
                          : selectedRole === "ADMIN"
                          ? "JUDGE / ADMIN"
                          : "CONTENT CREATOR"}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthMode("choose_role")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Change Role
                </button>
              </div>

              {/* Clerk Sign Up Component Container */}
              <div
                className={`p-4 border-3 ${
                  isDark
                    ? "border-[#383a45] bg-[#1c1d22] shadow-[4px_4px_0px_#000000]"
                    : "border-[var(--ink)] bg-[#fffdf7] shadow-[4px_4px_0px_#101010]"
                } flex justify-center`}
              >
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
                  fallbackRedirectUrl="/auth/callback"
                  forceRedirectUrl="/auth/callback"
                  signInUrl="#signin"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className="text-xs font-mono font-bold text-[var(--ink)] dark:text-[#f5f0e7] underline hover:opacity-80 cursor-pointer"
                >
                  Already have an account? Sign In →
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: Clerk SignIn View */}
          {authMode === "signin" && (
            <div className="space-y-4">
              <div
                className={`flex items-center justify-between pb-3 border-b-2 ${
                  isDark ? "border-[#383a45]" : "border-[var(--ink)]"
                }`}
              >
                <div>
                  <h3 className="font-mono font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                    Sign In to BrandLens
                  </h3>
                  <p className="text-[10px] font-mono text-[#666] dark:text-[#999]">
                    AUTHENTICATE VIA CLERK IDENTITY PROVIDER
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthMode("choose_role")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Roles
                </button>
              </div>

              {/* Clerk Sign In Component Container */}
              <div
                className={`p-4 border-3 ${
                  isDark
                    ? "border-[#383a45] bg-[#1c1d22] shadow-[4px_4px_0px_#000000]"
                    : "border-[var(--ink)] bg-[#fffdf7] shadow-[4px_4px_0px_#101010]"
                } flex justify-center`}
              >
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0 bg-transparent w-full",
                    },
                  }}
                  fallbackRedirectUrl="/auth/callback"
                  forceRedirectUrl="/auth/callback"
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

export default SignUpModal;
