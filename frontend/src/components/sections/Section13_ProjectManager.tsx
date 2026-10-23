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
      "Relax knowing that everything will be approved by the right people in the right order. Set up custom review steps and automate policy handoffs.",
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
    heading: "Track all your approvals in your online dashboard in real time",
    description:
      "Gain complete visibility into who reviewed, what corrections were applied, and who authorized overrides across all your active campaigns.",
    image: "/images/06-approval-tracking.webp",
  },
];

export function Section13_ProjectManager() {
  const [activeTab, setActiveTab] = useState("workflows");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-background font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-8">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color">
            A clear overview for project managers and marketers
          </h2>
        </div>

        {/* Feature Tabs Bar */}
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
            <div className="relative rounded-sm overflow-hidden border border-border shadow-sm bg-palette-7/30 p-2 min-h-[340px] flex items-center justify-center">
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
        <div className="bg-palette-7/30 border border-palette-1 rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-background shadow-2xs shrink-0 bg-palette-7">
            <Image
              src="/images/53-melissa-abrini.webp"
              alt="Melissa Abrini"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-serif text-lg font-normal italic leading-[1.4] text-equally-action-color mb-2">
              &ldquo;Before Inkloom AI, our review process was pretty chaotic. Feedback came flying in from all directions – emails, Slack, decks, even WhatsApp. Unverified delivery claims and prohibited terminology slipped into campaign collateral. Inkloom AI catches every discrepancy before launch.&rdquo;
            </p>
            <p className="font-sans text-base leading-[1.4]">
              <span className="font-bold text-equally-action-color">Melissa Abrini</span> — <span className="text-text-muted">Creative Director at Creative Agency Story</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
