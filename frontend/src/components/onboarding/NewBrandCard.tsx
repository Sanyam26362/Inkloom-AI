"use client";

import React, { useRef } from "react";
import Image from "next/image";

interface NewBrandCardProps {
  isSelected: boolean;
  onSelect: () => void;
  brandName: string;
  onBrandNameChange: (value: string) => void;
  brandTone: string;
  onBrandToneChange: (value: string) => void;
  onFileSelect?: (file: File) => void;
  selectedFile?: File | null;
}

export function NewBrandCard({
  isSelected,
  onSelect,
  brandName,
  onBrandNameChange,
  brandTone,
  onBrandToneChange,
  onFileSelect,
  selectedFile,
}: NewBrandCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDropzoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative rounded-[22px] p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between bg-white dark:bg-[#15161E] ${
        isSelected
          ? "border-2 border-[#635BFF] shadow-[0_10px_30px_rgba(99,91,255,0.10)] ring-1 ring-[#635BFF]/30"
          : "border border-slate-200 dark:border-[#2b2c36] hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
      }`}
    >
      <div>
        {/* Top Header: Logo, Name, Subtitle, Radio */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Purple '+' logo */}
            <div className="w-10 h-10 rounded-xl bg-[#635BFF] flex items-center justify-center font-bold text-white text-xl shadow-xs select-none shrink-0">
              +
            </div>
            <div>
              <h3
                className="font-bold text-base text-slate-900 dark:text-white leading-tight"
                style={{
                  fontFamily:
                    'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                New Brand
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-none mt-1">
                Custom Enterprise Tenant
              </p>
            </div>
          </div>

          {/* Radio Indicator */}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isSelected
                ? "border-2 border-[#635BFF]"
                : "border-2 border-slate-300 dark:border-slate-600"
            }`}
          >
            {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#635BFF]" />}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-4 mb-5">
          Configure a brand from scratch. Upload any PDF or markdown brand book and let our AI pipeline extract and index governance rules automatically.
        </p>

        {/* Two-column features & Dropzone illustration */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] items-center gap-4 mb-5">
          {/* Left features list */}
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span>Upload brand guidelines</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </span>
              <span>Auto-extract rules with AI</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m16 6 4 14H4L8 6Z" />
                  <path d="M12 2v4" />
                  <path d="m8 10 8 0" />
                  <path d="m7 14 10 0" />
                </svg>
              </span>
              <span>Define custom policies</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>Invite team members</span>
            </li>
          </ul>

          {/* Right SVG Illustration Dropzone */}
          <div
            onClick={handleDropzoneClick}
            className="flex flex-col items-center justify-center cursor-pointer group"
            title="Upload brand book"
          >
            <div className="w-full max-w-[190px] relative transition-transform duration-200 group-hover:scale-102">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/illustrations/brand-upload-dropzone.svg"
                alt="Brand book upload dropzone illustration"
                className="w-full h-auto object-contain pointer-events-none select-none"
              />
            </div>
            {selectedFile && (
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 truncate max-w-[180px]">
                ✓ {selectedFile.name}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.md,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onFileSelect) {
                  onFileSelect(f);
                }
              }}
            />
          </div>
        </div>

        {/* Custom Brand Inputs when Selected */}
        {isSelected && (
          <div
            className="space-y-2.5 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={brandName}
                onChange={(e) => onBrandNameChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111218] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tone & Persona
              </label>
              <input
                type="text"
                placeholder="e.g. Vibrant, youthful, customer-obsessed"
                value={brandTone}
                onChange={(e) => onBrandToneChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111218] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacer for height consistency */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Custom Brand Workspace</span>
        <span className="text-[11px] text-[#635BFF] font-medium">Self-serve RAG</span>
      </div>
    </div>
  );
}
