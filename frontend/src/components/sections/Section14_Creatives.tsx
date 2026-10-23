"use client";

import React, { useState } from "react";
import Image from "next/image";

interface Tab {
  id: string;
  label: string;
  heading: string;
  description: string;
  image: string;
}

const tabs: Tab[] = [
  {
    id: "multi-modal",
    label: "Multi-modal intake",
    heading: "Upload copy, Markdown, audio voiceovers, or video reels",
    description:
      "Paste text, Markdown, HTML, or upload audio (MP3, WAV) and video reels (MP4, MOV). Speech-to-text and on-screen dialogue are parsed into editable audit revisions automatically.",
    image: "/images/01-upload-files-to-filestage.webp",
  },
  {
    id: "inline-highlights",
    label: "Inline violation highlights",
    heading: "Inspect pinpoint violation spans with exact brand guideline citations",
    description:
      "Every finding displays severity (Critical, Warning, Suggestion), explanation of policy conflict, and approved replacement terms according to your company handbook.",
    image: "/images/07-packaging-file-review-comment-threads.webp",
  },
  {
    id: "remediation",
    label: "One-click remediation",
    heading: "Apply suggested terminology and track version improvements",
    description:
      "Resolve findings, accept suggested rewrites, or post contextual comments directly on each violation card to keep creators and reviewers perfectly synchronized.",
    image: "/images/08-to-do-lists.webp",
  },
];

export function Section14_Creatives() {
  const [activeTab, setActiveTab] = useState("multi-modal");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-[#fafafa]">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            For Creators &amp; Copywriters
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25]">
            Empowering creative teams with instant brand guardrails
          </h2>
        </div>

        {/* Feature Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-4 font-['Lato',sans-serif] text-base font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 -mb-[2px] ${
                  isActive
                    ? "border-[#005797] text-[#005797]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content & Graphic */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-12">
          <div className="lg:col-span-5 flex flex-col">
            <h3 className="font-['Domine',serif] text-xl sm:text-2xl font-bold text-[#111827] mb-3 leading-snug">
              {currentTab.heading}
            </h3>
            <p className="font-['Lato',sans-serif] text-base text-[#4b5563] leading-relaxed">
              {currentTab.description}
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white p-2 min-h-[340px] flex items-center justify-center">
              <Image
                key={currentTab.id}
                src={currentTab.image}
                alt={currentTab.heading}
                width={794}
                height={449}
                className="w-full h-auto object-cover rounded-xl transition-opacity duration-300"
              />
            </div>
          </div>
        </div>

        {/* Customer Quote Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-sm">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-gray-100">
            <Image
              src="/images/59-sarah-chen.webp"
              alt="Naeran Rubio"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-['Domine',serif] text-base sm:text-lg italic text-[#111827] mb-2 leading-relaxed">
              &ldquo;Our copywriters simply upload video reels and audio voiceovers. Inkloom AI immediately flags unapproved delivery guarantees, verifies claims against our facts database, and checks color contrast automatically.&rdquo;
            </p>
            <p className="font-['Lato',sans-serif] text-sm text-[#4b5563]">
              <span className="font-bold text-[#111827]">Naeran Rubio</span> — Associate Director of Content &amp; Communications
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
