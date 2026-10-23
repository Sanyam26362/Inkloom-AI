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
    id: "file-sharing",
    label: "File sharing",
    heading: "Simply drag a file into your dashboard to share it and start a review",
    description:
      "Share designs, videos, audio, documents, and live websites in one easy-to-use platform. No account required for external reviewers.",
    image: "/images/01-upload-files-to-filestage.webp",
  },
  {
    id: "comment-threads",
    label: "Comment threads",
    heading: "Get clear and consolidated feedback right on top of your files",
    description:
      "Pinpoint exact coordinates, highlight text, and draw directly on visual assets. Keep discussions organized in threaded comments.",
    image: "/images/07-packaging-file-review-comment-threads.webp",
  },
  {
    id: "to-do-lists",
    label: "To-do lists",
    heading: "Use comments as an interactive to-do list for revision cycles",
    description:
      "Check off items as revisions are completed so you never miss a required edit or overlook critical stakeholder input.",
    image: "/images/08-to-do-lists.webp",
  },
];

export function Section14_Creatives() {
  const [activeTab, setActiveTab] = useState("file-sharing");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-[#fafafa]">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            For Creatives & Designers
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25]">
            More time for creatives to focus on their craft
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
              &ldquo;Our designer simply uploads the video, sends it to the group, and everyone is able to comment and select the area where the changes need to happen.&rdquo;
            </p>
            <p className="font-['Lato',sans-serif] text-sm text-[#4b5563]">
              <span className="font-bold text-[#111827]">Naeran Rubio</span> — Associate Director of Content & Communications, Sharp
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
