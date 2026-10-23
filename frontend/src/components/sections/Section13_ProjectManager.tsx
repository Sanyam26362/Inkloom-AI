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
    id: "workflows",
    label: "Review workflows",
    heading: "Automate structured review paths from draft to publication",
    description:
      "Relax knowing that every asset will be audited against brand rules and approved by authorized managers before release. Configure role-based review states with automated handoffs.",
    image: "/images/02-review-workflows.webp",
  },
  {
    id: "compliance",
    label: "Compliance scoring",
    heading: "Live 0-100 compliance scores with severity-weighted deductions",
    description:
      "Critical violations deduct 25 points, warnings deduct 10 points, and suggestions deduct 3 points. View violation categories and auto-remediation progress in real time.",
    image: "/images/05-due-date-reminders.webp",
  },
  {
    id: "tracking",
    label: "Approval tracking",
    heading: "Track every review status, comment thread, and decision in real time",
    description:
      "Gain complete visibility into who reviewed, what corrections were applied, and who authorized overrides across all your active campaigns.",
    image: "/images/06-approval-tracking.webp",
  },
];

export function Section13_ProjectManager() {
  const [activeTab, setActiveTab] = useState("workflows");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#005797] text-xs font-bold uppercase tracking-wider mb-3">
            For Project Managers &amp; Brand Leads
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25]">
            A clear overview for project managers and brand directors
          </h2>
        </div>

        {/* Feature Tabs Bar */}
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
                height={449}
                className="w-full h-auto object-cover rounded-xl transition-opacity duration-300"
              />
            </div>
          </div>
        </div>

        {/* Customer Quote Card */}
        <div className="bg-[#f9fafb] border border-gray-200/70 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-gray-100">
            <Image
              src="/images/53-melissa-abrini.webp"
              alt="Melissa Abrini"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-['Domine',serif] text-base sm:text-lg italic text-[#111827] mb-2 leading-relaxed">
              &ldquo;Before Inkloom AI, our brand reviews were completely ad-hoc. Unverified delivery claims and prohibited terminology slipped into press releases and Instagram ads. Inkloom AI catches every discrepancy before launch.&rdquo;
            </p>
            <p className="font-['Lato',sans-serif] text-sm text-[#4b5563]">
              <span className="font-bold text-[#111827]">Melissa Abrini</span> — Creative Director at Creative Agency Story
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
