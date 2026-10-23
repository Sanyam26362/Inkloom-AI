"use client";

import React from "react";

export function Section22_Copyright() {
  return (
    <div className="py-6 bg-white border-t border-gray-200/80 text-center font-['Lato',sans-serif] text-xs text-[#6b7280]">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 Filestage GmbH. All rights reserved.</p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#" className="hover:underline hover:text-[#111827] transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline hover:text-[#111827] transition-colors">
            Cookie Settings
          </a>
          <a href="#" className="hover:underline hover:text-[#111827] transition-colors">
            Imprint
          </a>
          <a href="#" className="hover:underline hover:text-[#111827] transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:underline hover:text-[#111827] transition-colors">
            Security Overview
          </a>
        </div>
      </div>
    </div>
  );
}
