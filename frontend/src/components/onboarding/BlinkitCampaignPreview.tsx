"use client";

import React from "react";

export function BlinkitCampaignPreview() {
  return (
    <div className="relative w-full max-w-[210px] h-[130px] flex items-center justify-center select-none shrink-0 pointer-events-none">
      {/* Background Yellow Card */}
      <div className="absolute top-0 right-2 w-[170px] h-[100px] rounded-xl bg-gradient-to-br from-[#FEE588] to-[#F8C200] p-2.5 shadow-sm border border-[#F5B800] flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">
            blinkit
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
        </div>

        {/* Delivery Vehicle Mini Graphic */}
        <div className="self-end -mr-1 -mb-1 opacity-90">
          <svg width="68" height="42" viewBox="0 0 68 42" fill="none">
            {/* Scooter / Delivery Cart silhouette */}
            <rect x="22" y="10" width="34" height="22" rx="4" fill="#E5AA00" />
            <circle cx="16" cy="32" r="7" fill="#1C1C1E" />
            <circle cx="16" cy="32" r="3" fill="#F8C200" />
            <circle cx="50" cy="32" r="7" fill="#1C1C1E" />
            <circle cx="50" cy="32" r="3" fill="#F8C200" />
            <path d="M12 24 L22 24 L28 14 L42 14" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
            <rect x="26" y="14" width="16" height="12" rx="2" fill="#FFFFFF" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Floating Dark Badge "Delivery in minutes" */}
      <div className="absolute top-10 right-0 z-20 bg-[#1E293B] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md border border-slate-700/50 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Delivery in min</span>
      </div>

      {/* Foreground White Diwali Card */}
      <div className="absolute -bottom-1 left-2 z-10 w-[165px] bg-white dark:bg-[#1E202A] rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-slate-700 p-2 flex items-center justify-between gap-1.5">
        {/* Rider Icon / Graphic */}
        <div className="w-9 h-9 rounded-lg bg-[#FFF7D6] dark:bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-300/40">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7" r="3.5" fill="#F8C200" />
            <path
              d="M5 19 C5 15.5 8 13 12 13 C16 13 19 15.5 19 19"
              stroke="#1C1C1E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Delivery bag */}
            <rect x="15" y="11" width="6" height="7" rx="1.5" fill="#F8C200" stroke="#1C1C1E" strokeWidth="1" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-none">
            Diwali
          </span>
          <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">
            2026
          </span>
        </div>

        {/* Yellow Circle Arrow Button */}
        <div className="w-5 h-5 rounded-full bg-[#F8C200] flex items-center justify-center text-slate-900 shrink-0 shadow-2xs">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
