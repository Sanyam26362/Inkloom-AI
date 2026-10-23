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
    label: "Real-time alerts",
    heading: "Instant notifications when collateral requires reviewer or manager review",
    description:
      "Role-based alerts ensure review queues move swiftly without bottlenecks. Reviewers see pending drafts, compliance scores, and flagged severity breakdowns immediately.",
    image: "/images/03-email-notifications-1.webp",
  },
  {
    id: "annotations",
    label: "Audit annotations",
    heading: "Explore detailed findings with guideline citations and recommended fixes",
    description:
      "Deterministic term replacements, WCAG contrast ratios, and semantic guideline matches are presented in clear, interactive finding cards with full context.",
    image: "/images/09-barcode-annotations.webp",
  },
  {
    id: "decisions",
    label: "Defensible sign-offs",
    heading: "Formally approve, request changes, or override findings with required notes",
    description:
      "Brand managers can approve compliant collateral or override specific warnings by submitting a logged justification, guaranteeing a transparent and accountable review trail.",
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
            For Reviewers &amp; Stakeholders
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25]">
            Defensible review decisions and stakeholder alignment
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
              &ldquo;Inkloom AI makes compliance reviews transparent. We know with mathematical certainty which rule was triggered, why it failed, and what the approved correction is. The audit history protects our brand reputation.&rdquo;
            </p>
            <p className="font-['Lato',sans-serif] text-sm text-[#4b5563]">
              <span className="font-bold text-[#111827]">Sarah Chen</span> — Compliance Review Director
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
