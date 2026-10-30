"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f5ef] dark:bg-[#101010] font-mono">
      <div className="w-full max-w-md p-6 border-4 border-black bg-white dark:bg-[#1c1d22] shadow-[8px_8px_0px_#000]">
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-0 p-0 bg-transparent w-full",
            },
          }}
          fallbackRedirectUrl="/auth/callback"
          forceRedirectUrl="/auth/callback"
        />
      </div>
    </div>
  );
}

