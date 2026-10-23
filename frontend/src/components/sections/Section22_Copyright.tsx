"use client";

import React from "react";
import Link from "next/link";

export function Section22_Copyright() {
  return (
    <div className="py-6 bg-white border-t border-gray-200/80 text-center font-['Lato',sans-serif] text-xs text-[#6b7280]">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 Inkloom AI. Enterprise Brand Governance Platform. All rights reserved.</p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/audit" className="hover:underline hover:text-[#111827] transition-colors">
            Audit Workspace
          </Link>
          <Link href="/guidelines" className="hover:underline hover:text-[#111827] transition-colors">
            Brand Guidelines
          </Link>
          <Link href="/dashboard" className="hover:underline hover:text-[#111827] transition-colors">
            Governance Console
          </Link>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:underline hover:text-[#111827] transition-colors">
            API Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
