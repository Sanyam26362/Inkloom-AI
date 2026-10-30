"use client";

import React from "react";

export function HeroComputerIllustration() {
  return (
    <div className="relative w-full max-w-[460px] py-4 select-none">
      {/* ========================================================
          STAGE 2: Bottom Layers (0.5s - 1.5s)
          Layer 2: Bottom-most black offset shadow
          Layer 3: White backing/base window layer
          ======================================================== */}
      <div
        aria-hidden="true"
        className="nb-layer-back-window absolute inset-0 bg-white border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)]"
      >
        <div className="h-8 bg-[var(--nb-ink)] border-b-[3px] border-[var(--nb-ink)] flex items-center px-3">
          <span className="w-2.5 h-2.5 bg-white opacity-40"></span>
        </div>
      </div>

      {/* ========================================================
          STAGE 3: Main Computer Frame (1.5s - 2.5s)
          Layer 4: Additional offset black shadow layers (shadow-[8px_8px_0_var(--nb-ink)])
          Layer 5: Main blue computer body
          ======================================================== */}
      <div className="nb-layer-front-window relative bg-[var(--nb-blue)] border-[3px] border-[var(--nb-ink)] shadow-[8px_8px_0_var(--nb-ink)]">
        {/* Layer 6: Black computer window header */}
        <div className="nb-layer-header bg-[var(--nb-ink)] text-white px-3 py-2 flex items-center justify-between border-b-[3px] border-[var(--nb-ink)] select-none">
          <div className="flex items-center gap-2">
            {/* Small Grid Icon (pure SVG) */}
            <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" />
              <rect x="9" y="1" width="6" height="6" />
              <rect x="1" y="9" width="6" height="6" />
              <rect x="9" y="9" width="6" height="6" />
            </svg>
            <span className="nb-mono text-xs font-bold tracking-wider">
              MULTI-MODAL_QA.EXE
            </span>
          </div>

          {/* 3 Window Buttons: minimise, maximise, close */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-white text-[var(--nb-ink)] flex items-center justify-center font-bold text-[10px] border border-[var(--nb-ink)] leading-none">
              _
            </div>
            <div className="w-4 h-4 bg-white text-[var(--nb-ink)] flex items-center justify-center font-bold text-[10px] border border-[var(--nb-ink)] leading-none">
              □
            </div>
            <div className="w-4 h-4 bg-[var(--nb-red)] text-white flex items-center justify-center font-bold text-[10px] border border-[var(--nb-ink)] leading-none">
              ✕
            </div>
          </div>
        </div>

        {/* Window Body (Blue #A5D8FF) */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* ========================================================
              STAGE 4: Pink Screen Entrance (2.5s - 3.2s)
              Layer 7: Pink video screen
              ======================================================== */}
          <div className="nb-layer-pink-screen relative bg-[var(--nb-pink)] border-[3px] border-[var(--nb-ink)] p-4 h-44 sm:h-48 flex flex-col justify-between shadow-[3px_3px_0_var(--nb-ink)] overflow-hidden">
            {/* Top row inside pink screen */}
            <div className="flex items-center justify-between">
              {/* Layer 8: White video screen label (Stage 6: 4.0s) */}
              <span className="nb-layer-video-label nb-mono text-xs font-bold text-[var(--nb-ink)] bg-white px-2 py-0.5 border border-[var(--nb-ink)]">
                BRAND FILM / FRAME 0842
              </span>
              {/* Layer 9: Small decorative status indicator (Stage 6: 4.15s) */}
              <span className="nb-layer-red-dot w-2.5 h-2.5 bg-[var(--nb-red)] border border-[var(--nb-ink)] animate-pulse"></span>
            </div>

            {/* Layer 10: Yellow play button with black border and shadow (Stage 6: 4.25s) */}
            <div className="nb-layer-play-btn self-center">
              <div className="w-12 h-12 bg-[var(--nb-yellow)] border-[3px] border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] flex items-center justify-center cursor-pointer transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5">
                <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-[var(--nb-ink)] ml-1"></div>
              </div>
            </div>

            {/* Layer 11: Black timestamp label (Stage 6: 4.4s) */}
            <div className="nb-layer-timestamp self-start">
              <span className="nb-mono text-xs sm:text-[13px] font-bold bg-[var(--nb-ink)] text-white px-2.5 py-1 border border-[var(--nb-ink)]">
                00:14:08 / 01:02:11
              </span>
            </div>
          </div>

          {/* Layer 12: Analysis text with typewriter effect (Stage 6: 4.55s) */}
          <div className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] tracking-wider min-h-[20px] flex items-center">
            <span className="nb-layer-analysis-text">ANALYZING FRAME 0842...</span>
          </div>

          {/* Finding Rows */}
          <div className="flex flex-col gap-2.5">
            {/* ========================================================
                STAGE 5: White Panels Entrance (3.2s - 4.0s)
                Layer 13: First white warning panel
                ======================================================== */}
            <div className="nb-layer-panel-warning bg-white border-[3px] border-[var(--nb-ink)] p-3 shadow-[3px_3px_0_var(--nb-ink)]">
              {/* Layer 14: Red warning label (Stage 6: 4.7s) */}
              <div className="flex items-center gap-2 mb-1">
                <span className="nb-layer-chip-red nb-chip nb-chip-critical text-xs py-0.5 px-2">
                  ! UNAPPROVED CLAIM
                </span>
              </div>
              {/* Layer 15: Warning description text (Stage 6: 4.8s) */}
              <p className="nb-layer-desc-warning nb-mono text-xs sm:text-sm text-[var(--nb-ink)] font-medium">
                &quot;#1 in the category&quot; has no approved source
              </p>
            </div>

            {/* Layer 16: Second white verification panel (3.5s) */}
            <div className="nb-layer-panel-verify bg-white border-[3px] border-[var(--nb-ink)] p-3 shadow-[3px_3px_0_var(--nb-ink)]">
              {/* Layer 17: Green verification label (Stage 6: 4.95s) */}
              <div className="flex items-center gap-2 mb-1">
                <span className="nb-layer-chip-green nb-chip nb-chip-pass text-xs py-0.5 px-2">
                  ✓ LOGO CLEAR SPACE
                </span>
              </div>
              {/* Layer 18: Verification description text (Stage 6: 5.05s) */}
              <p className="nb-layer-desc-verify nb-mono text-xs sm:text-sm text-[var(--nb-ink)] font-medium">
                Meets minimum clearance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
