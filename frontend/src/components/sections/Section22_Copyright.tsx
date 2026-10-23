"use client";

import React from "react";
import Link from "next/link";

export function Section22_Copyright() {
  return (
    <div className="py-6 bg-background border-t border-palette-1 text-center font-sans text-2xs leading-[1.4] text-text-muted">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 Inkloom AI. Enterprise Brand Governance Platform. All rights reserved.</p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/audit" className="hover:underline hover:text-equally-action-color transition-colors">
            Audit Workspace
          </Link>
          <Link href="/guidelines" className="hover:underline hover:text-equally-action-color transition-colors">
            Brand Guidelines
          </Link>
          <Link href="/dashboard" className="hover:underline hover:text-equally-action-color transition-colors">
            Governance Console
          </Link>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:underline hover:text-equally-action-color transition-colors">
            API Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
