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
      "Share designs, video reels, audio stems, HTML copy, and live websites in one easy-to-use platform. No account required for external reviewers.",
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
    heading: "Use comments as a to-do list in BrandLens",
    description:
      "Check off items as revisions are completed so you never miss a required edit or overlook critical stakeholder input.",
    image: "/images/08-to-do-lists.webp",
  },
];

export function Section14_Creatives() {
  const [activeTab, setActiveTab] = useState("file-sharing");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-palette-7/30 font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-8">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color">
            More time for creatives to focus on their craft
          </h2>
        </div>

        {/* Feature Tabs */}
        <div className="flex border-b border-border mb-8 overflow-x-auto gap-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-sans text-base font-bold leading-[1.4] transition-all whitespace-nowrap cursor-pointer border-b-2 -mb-[2px] ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-equally-action-color"
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
            <h3 className="font-serif text-xl font-bold leading-[1.2] text-equally-action-color mb-3">
              {currentTab.heading}
            </h3>
            <p className="font-sans text-base leading-[1.4] text-text-primary">
              {currentTab.description}
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="relative rounded-sm overflow-hidden border border-border shadow-sm bg-background p-2 min-h-[340px] flex items-center justify-center">
              <Image
                key={currentTab.id}
                src={currentTab.image}
                alt={currentTab.heading}
                width={794}
                height={449}
                className="w-full h-auto object-cover rounded-sm transition-opacity duration-300"
              />
            </div>
          </div>
        </div>

        {/* Customer Quote Card */}
        <div className="bg-background border border-border rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-2xs">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-background shadow-2xs shrink-0 bg-palette-7">
            <Image
              src="/images/59-sarah-chen.webp"
              alt="Naeran Rubio"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-serif text-lg font-normal italic leading-[1.4] text-equally-action-color mb-2">
              &ldquo;Our designer simply uploads the video reel, sends it to the group, and everyone is able to comment and select the area where the changes need to happen. BrandLens immediately verifies our claims against our facts database.&rdquo;
            </p>
            <p className="font-sans text-base leading-[1.4]">
              <span className="font-bold text-equally-action-color">Naeran Rubio</span> — <span className="text-text-muted">Associate Director of Content &amp; Communications, Sharp</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
