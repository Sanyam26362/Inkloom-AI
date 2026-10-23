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
    heading: "Follow the same review process for your entire project",
    description:
      "Relax knowing that everything will be approved by the right people in the right order. Set up custom review steps and automate handoffs.",
    image: "/images/02-review-workflows.webp",
  },
  {
    id: "due-dates",
    label: "Due date reminders",
    heading: "Set due dates in your dashboard to make sure feedback arrives on time",
    description:
      "Automated reminder emails gently nudge stakeholders before deadlines expire, keeping projects on schedule without manual follow-ups.",
    image: "/images/05-due-date-reminders.webp",
  },
  {
    id: "tracking",
    label: "Approval tracking",
    heading: "Track all your approvals in your online dashboard in real time",
    description:
      "Gain full visibility into who has reviewed, who has approved, and what changes are pending across every file and campaign.",
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
            For Project Managers & Marketers
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25]">
            A clear overview for project managers and marketers
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
              &ldquo;Before Filestage, our review process was pretty chaotic. Feedback came flying in from all directions – emails, Slack, PowerPoint decks, even WhatsApp (yes, really). It felt like one’s entire role was chasing approvals.&rdquo;
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
