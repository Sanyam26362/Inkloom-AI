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
    id: "notifications",
    label: "Email notifications",
    heading: "Get an email notification when there’s a new file or version to review",
    description:
      "Integrate with Microsoft Teams or Slack to receive notifications in your dedicated channels. Reviewers click one link and review immediately without creating passwords.",
    image: "/images/03-email-notifications-1.webp",
  },
  {
    id: "annotations",
    label: "Annotations",
    heading: "Simply click on what you want to change and add your comment",
    description:
      "Barcode scanning, color code inspection, and text-selection highlights give clients intuitive ways to mark up exactly what they mean.",
    image: "/images/09-barcode-annotations.webp",
  },
  {
    id: "decisions",
    label: "Review decisions",
    heading: "Submit review decisions in one click: Approve or Request Changes",
    description:
      "Clear green approvals and red change requests eliminate guesswork, ensuring production teams know precisely when an asset is greenlit.",
    image: "/images/10-review-decisions.webp",
  },
];

export function Section15_Stakeholders() {
  const [activeTab, setActiveTab] = useState("notifications");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
            For Clients & Stakeholders
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25]">
            Faster feedback for clients and stakeholders
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
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-gray-50 p-2 min-h-[340px] flex items-center justify-center">
              <Image
                key={currentTab.id}
                src={currentTab.image}
                alt={currentTab.heading}
                width={794}
                height={448}
                className="w-full h-auto object-cover rounded-xl transition-opacity duration-300"
              />
            </div>
          </div>
        </div>

        {/* Customer Quote Card */}
        <div className="bg-[#f9fafb] border border-gray-200/70 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-gray-100">
            <Image
              src="/images/59-sarah-chen.webp"
              alt="Sarah Chen"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-['Domine',serif] text-base sm:text-lg italic text-[#111827] mb-2 leading-relaxed">
              &ldquo;Filestage makes things easy. All the files and versions are in the same place. The clients really appreciate the ease of use and being able to have a clear overview of their projects.&rdquo;
            </p>
            <p className="font-['Lato',sans-serif] text-sm text-[#4b5563]">
              <span className="font-bold text-[#111827]">Sarah Chen</span> — Copy Director/Medical Director, Publicis Health France
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
