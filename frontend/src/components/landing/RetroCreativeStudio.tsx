"use client";

import React from "react";

interface RetroCreativeStudioProps {
  onReset?: () => void;
}

export function RetroCreativeStudio({ onReset }: RetroCreativeStudioProps) {
  return (
    <div
      className="nb-studio-container relative w-full h-full overflow-hidden select-none font-mono flex flex-col justify-between p-2 sm:p-2.5"
      role="region"
      aria-label="BrandLens Retro AI Creative Studio Animation"
    >
      {/* Background Pixel Grid & Corner Crosshairs */}
      <div className="absolute inset-0 pointer-events-none opacity-20 nb-studio-grid" />
      <span className="absolute top-1 left-1 text-[9px] font-bold text-[var(--nb-ink)] opacity-40 leading-none select-none">+</span>
      <span className="absolute top-1 right-1 text-[9px] font-bold text-[var(--nb-ink)] opacity-40 leading-none select-none">+</span>
      <span className="absolute bottom-1 left-1 text-[9px] font-bold text-[var(--nb-ink)] opacity-40 leading-none select-none">+</span>
      <span className="absolute bottom-1 right-1 text-[9px] font-bold text-[var(--nb-ink)] opacity-40 leading-none select-none">+</span>

      {/* Top Header Bar of the Studio Screen */}
      <div className="relative z-20 flex items-center justify-between text-[10px] font-bold text-[var(--nb-ink)] tracking-wider">
        <div className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]">
          <span className="w-2 h-2 bg-[var(--nb-red)] border border-[var(--nb-ink)] nb-studio-rec-dot" />
          <span className="tracking-tighter sm:tracking-normal">STUDIO://AI_QA</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-[var(--nb-yellow)] px-1.5 py-0.5 border border-[var(--nb-ink)] shadow-[1px_1px_0_var(--nb-ink)]">
            <span className="hidden xs:inline">MULTI-CHANNEL</span>
            <span className="tracking-tight">60 FPS</span>
          </div>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Return to static preview"
              aria-label="Return to static preview"
              className="bg-white hover:bg-[var(--nb-cream)] text-[var(--nb-ink)] px-1.5 py-0.5 border border-[var(--nb-ink)] font-bold text-[9px] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[1px_1px_0_var(--nb-ink)] flex items-center gap-1"
            >
              <span>✕</span>
              <span className="hidden xs:inline">STOP</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stage Area: Houses the Scenes */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center overflow-hidden my-0.5 sm:my-1">
        
        {/* ========================================================
            SCENE 1 & 2: Dynamic Creative Poster + Retro AI Analysis
            ======================================================== */}
        <div className="nb-studio-poster absolute inset-auto flex flex-col justify-between bg-white border-[2.5px] border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] p-2">
          {/* Subtle Poster Texture */}
          <div className="absolute inset-0 bg-[var(--nb-cream)] opacity-30 pointer-events-none" />

          {/* Poster Top Bar */}
          <div className="relative z-10 flex items-center justify-between border-b border-[var(--nb-ink)] pb-1">
            <div className="flex items-center gap-1">
              {/* Lightning Bolt Logo Emblem */}
              <div className="w-4 h-4 bg-[var(--nb-yellow)] border border-[var(--nb-ink)] flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-[var(--nb-ink)]" aria-hidden="true">
                  <polygon points="9 1 3 9 8 9 7 15 13 7 8 7 9 1" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold tracking-wider text-[var(--nb-ink)]">
                KINETIC // 01
              </span>
            </div>
            <span className="text-[9px] font-bold bg-[var(--nb-ink)] text-white px-1 py-0.2">
              SS26
            </span>
          </div>

          {/* Poster Middle: Headline & Stickers */}
          <div className="relative z-10 my-1 flex items-center justify-between">
            <div>
              <div className="text-[13px] sm:text-[15px] font-black tracking-tight leading-none text-[var(--nb-ink)] uppercase font-sans">
                MAKE YOUR<br />MARK.
              </div>
              <div className="text-[8px] font-semibold text-[var(--nb-ink)] tracking-wider mt-0.5">
                SPEED // PRECISION // IMPACT
              </div>
            </div>

            {/* Overlapping Neo-Brutalist Graphic Elements */}
            <div className="relative flex flex-col items-end gap-1">
              <span className="text-[8px] font-black bg-[var(--nb-yellow)] text-[var(--nb-ink)] border border-[var(--nb-ink)] px-1 py-0.5 shadow-[1.5px_1.5px_0_var(--nb-ink)] -rotate-3">
                ★ DROP 01
              </span>
              <span className="text-[7.5px] font-black bg-[var(--nb-red)] text-white border border-[var(--nb-ink)] px-1 py-0.2 shadow-[1px_1px_0_var(--nb-ink)] rotate-3">
                NEW RELEASE
              </span>
            </div>
          </div>

          {/* Poster Bottom Bar */}
          <div className="relative z-10 flex items-center justify-between border-t border-[var(--nb-ink)] pt-1 text-[8px] text-[var(--nb-ink)] font-bold">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--nb-green)] border border-[var(--nb-ink)] inline-block" />
              <span>ACTIVE ASSET</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[var(--nb-yellow)] border border-[var(--nb-ink)] inline-block" />
              <span className="w-2 h-2 bg-[var(--nb-red)] border border-[var(--nb-ink)] inline-block" />
              <span className="w-2 h-2 bg-[var(--nb-blue)] border border-[var(--nb-ink)] inline-block" />
            </div>
          </div>

          {/* --------------------------------------------------------
              SCENE 2 OVERLAY: Retro AI Scanning Line & Bounding Boxes
              -------------------------------------------------------- */}
          <div className="nb-studio-analysis-layer absolute inset-0 pointer-events-none z-20">
            {/* The Scanning Laser Line */}
            <div className="nb-studio-scanline absolute left-0 right-0 h-1 bg-[var(--nb-green)] border-y border-[var(--nb-ink)] shadow-[0_0_8px_rgba(182,245,165,0.9)]">
              <span className="absolute -top-1.5 right-1 text-[7px] font-black bg-[var(--nb-ink)] text-[var(--nb-green)] px-1 leading-none">
                AI_SCAN
              </span>
            </div>

            {/* Bounding Box 1: Logo Detected */}
            <div className="nb-bbox-logo absolute top-1.5 left-1.5 w-24 h-6 border-2 border-[var(--nb-green)] pointer-events-none">
              <span className="absolute -top-3 left-0 text-[7px] font-black bg-[var(--nb-green)] text-[var(--nb-ink)] border border-[var(--nb-ink)] px-0.5 leading-tight whitespace-nowrap">
                [✓] LOGO DETECTED
              </span>
            </div>

            {/* Bounding Box 2: Font Verified */}
            <div className="nb-bbox-font absolute top-8 left-1.5 w-28 h-9 border-2 border-[var(--nb-yellow)] pointer-events-none">
              <span className="absolute -bottom-3 left-0 text-[7px] font-black bg-[var(--nb-yellow)] text-[var(--nb-ink)] border border-[var(--nb-ink)] px-0.5 leading-tight whitespace-nowrap">
                [✓] FONT VERIFIED
              </span>
            </div>

            {/* Bounding Box 3: Color Match */}
            <div className="nb-bbox-color absolute top-6 right-2 w-16 h-10 border-2 border-[var(--nb-blue)] pointer-events-none">
              <span className="absolute -top-3 right-0 text-[7px] font-black bg-[var(--nb-blue)] text-[var(--nb-ink)] border border-[var(--nb-ink)] px-0.5 leading-tight whitespace-nowrap">
                [✓] COLOR MATCH
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            SCENE 3 & 4: Multi-Platform Brand Distribution & Verification
            ======================================================== */}
        <div className="nb-studio-multi-showcase absolute inset-0 flex items-center justify-center gap-1.5 sm:gap-2.5 z-30">
          
          {/* Platform 1: Instagram Post (Square 1:1) */}
          <div className="nb-card-ig-post flex flex-col justify-between bg-white border-[2px] border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] p-1 w-[88px] sm:w-[98px] h-[115px] sm:h-[125px]">
            {/* Mini IG Header */}
            <div className="flex items-center justify-between border-b border-[var(--nb-ink)] pb-0.5 text-[7px]">
              <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 bg-[var(--nb-yellow)] border border-[var(--nb-ink)] inline-block" />
                <span className="font-extrabold truncate max-w-[45px]">kinetic</span>
              </div>
              <span className="text-[6px] font-bold">•••</span>
            </div>

            {/* Mini Square Post Body with identical brand language */}
            <div className="relative bg-[var(--nb-yellow)] border border-[var(--nb-ink)] p-1 flex-1 flex flex-col justify-between my-0.5 overflow-hidden">
              <div className="flex justify-between items-start">
                {/* Same Bolt Logo */}
                <svg viewBox="0 0 16 16" className="w-2 h-2 fill-[var(--nb-ink)]" aria-hidden="true">
                  <polygon points="9 1 3 9 8 9 7 15 13 7 8 7 9 1" />
                </svg>
                <span className="text-[5.5px] font-black bg-[var(--nb-ink)] text-white px-0.5">SS26</span>
              </div>
              <div className="text-[8px] font-black leading-tight text-[var(--nb-ink)] uppercase font-sans">
                MAKE<br />MARK.
              </div>
            </div>

            {/* Mini Social Icons Bar */}
            <div className="flex items-center justify-between text-[6.5px] text-[var(--nb-ink)] px-0.5">
              <span>♥ 💬 ↗</span>
              <span className="font-bold">★</span>
            </div>

            {/* Platform Tag */}
            <div className="mt-0.5 bg-[var(--nb-ink)] text-white text-[6.5px] font-bold text-center py-0.2 tracking-wider">
              IG POST 1:1
            </div>
          </div>

          {/* Platform 2: Instagram Story (Vertical 9:16) */}
          <div className="nb-card-ig-story flex flex-col justify-between bg-[var(--nb-cream)] border-[2px] border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] p-1 w-[74px] sm:w-[82px] h-[125px] sm:h-[135px]">
            {/* Story Top Dash Bars */}
            <div className="flex gap-0.5 pt-0.5">
              <div className="h-0.5 bg-[var(--nb-ink)] flex-1" />
              <div className="h-0.5 bg-[var(--nb-ink)] flex-1" />
              <div className="h-0.5 bg-[var(--nb-ink)]/30 flex-1" />
            </div>

            {/* Story User Info */}
            <div className="flex items-center gap-1 my-0.5 text-[6.5px] font-bold text-[var(--nb-ink)]">
              <span className="w-1.5 h-1.5 bg-[var(--nb-red)] border border-[var(--nb-ink)]" />
              <span>kinetic.co</span>
            </div>

            {/* Story Middle: Identical Brand Composition */}
            <div className="relative bg-white border border-[var(--nb-ink)] p-1 flex-1 flex flex-col justify-between my-0.5">
              <div className="flex items-center justify-between">
                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-[var(--nb-ink)]" aria-hidden="true">
                  <polygon points="9 1 3 9 8 9 7 15 13 7 8 7 9 1" />
                </svg>
                <span className="text-[6px] font-black bg-[var(--nb-yellow)] text-[var(--nb-ink)] px-0.5 border border-[var(--nb-ink)]">
                  DROP 01
                </span>
              </div>
              <div className="text-[8.5px] font-black leading-none text-[var(--nb-ink)] uppercase font-sans my-auto text-center">
                MAKE<br />YOUR<br />MARK
              </div>
              <div className="bg-[var(--nb-ink)] text-white text-[6px] font-black text-center py-0.5">
                SWIPE UP ↑
              </div>
            </div>

            {/* Platform Tag */}
            <div className="bg-[var(--nb-ink)] text-white text-[6.5px] font-bold text-center py-0.2 tracking-wider">
              STORY 9:16
            </div>
          </div>

          {/* Platform 3: Website Advertisement (Banner / Landscape) */}
          <div className="nb-card-web-ad flex flex-col justify-between bg-white border-[2px] border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] p-1 w-[96px] sm:w-[108px] h-[105px] sm:h-[115px]">
            {/* Browser Dots Bar */}
            <div className="flex items-center justify-between border-b border-[var(--nb-ink)] pb-0.5 text-[6.5px]">
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-[var(--nb-red)] border border-[var(--nb-ink)] inline-block" />
                <span className="w-1.5 h-1.5 bg-[var(--nb-yellow)] border border-[var(--nb-ink)] inline-block" />
                <span className="w-1.5 h-1.5 bg-[var(--nb-green)] border border-[var(--nb-ink)] inline-block" />
              </div>
              <span className="text-[6px] font-mono text-[var(--nb-ink)] font-bold">kinetic.com</span>
            </div>

            {/* Banner Content with identical brand elements */}
            <div className="relative bg-[var(--nb-blue)] border border-[var(--nb-ink)] p-1 flex-1 flex flex-col justify-between my-0.5">
              <div className="flex items-center justify-between">
                <div className="w-3 h-3 bg-white border border-[var(--nb-ink)] flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-2 h-2 fill-[var(--nb-ink)]" aria-hidden="true">
                    <polygon points="9 1 3 9 8 9 7 15 13 7 8 7 9 1" />
                  </svg>
                </div>
                <span className="text-[5.5px] font-black bg-[var(--nb-yellow)] border border-[var(--nb-ink)] px-0.5">
                  LIVE NOW
                </span>
              </div>
              <div className="text-[8px] font-black leading-tight text-[var(--nb-ink)] uppercase font-sans">
                MAKE YOUR MARK
              </div>
              <div className="bg-[var(--nb-ink)] text-white text-[6px] font-black text-center py-0.5">
                EXPLORE NOW →
              </div>
            </div>

            {/* Platform Tag */}
            <div className="bg-[var(--nb-ink)] text-white text-[6.5px] font-bold text-center py-0.2 tracking-wider">
              WEB AD 16:9
            </div>
          </div>

          {/* ========================================================
              SCENE 4: Bold Neo-Brutalist Verification Stamp
              ======================================================== */}
          <div className="nb-studio-stamp absolute inset-auto z-40 pointer-events-none flex flex-col items-center justify-center">
            <div className="bg-[var(--nb-green)] border-[3px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] px-3 py-1.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-[12px] font-black text-[var(--nb-ink)] tracking-wider leading-none">
                <span className="text-[13px] leading-none">✓</span>
                <span>BRAND APPROVED</span>
              </div>
              <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[var(--nb-ink)] tracking-widest mt-0.5 uppercase border-t border-[var(--nb-ink)] pt-0.5">
                03 PLATFORMS VERIFIED
              </div>
              <div className="mt-1 bg-[var(--nb-ink)] text-[var(--nb-green)] text-[7px] font-bold px-1 py-0.2 tracking-wider">
                RULE MATCH: 100% · AUDIT SIGNED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar of the Studio Screen */}
      <div className="relative z-20 flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-[var(--nb-ink)] border-t border-[var(--nb-ink)] pt-1 select-none">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[var(--nb-green)] border border-[var(--nb-ink)] inline-block" />
          <span className="nb-studio-status-text">OMNI-CHANNEL SYNC ACTIVE</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[9px]">
          <span className="text-[var(--nb-ink)] opacity-60">AUDIT_LOG:</span>
          <span className="bg-white border border-[var(--nb-ink)] px-1 py-0.2">#0842</span>
        </div>
      </div>
    </div>
  );
}
