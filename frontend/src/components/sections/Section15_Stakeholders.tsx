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

const tabs: [Tab, Tab, Tab] = [
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
    heading: "Submit review decisions in your online dashboard in one click",
    description:
      "Clear green approvals and red change requests eliminate guesswork, ensuring production teams know precisely when an asset is greenlit.",
    image: "/images/10-review-decisions.webp",
  },
];

export function Section15_Stakeholders() {
  const [activeTab, setActiveTab] = useState("notifications");
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-20 bg-background font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="text-left mb-8">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color">
            Faster feedback for clients and stakeholders
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
            <div className="relative rounded-sm overflow-hidden border border-border shadow-sm bg-palette-7/30 p-2 min-h-[340px] flex items-center justify-center">
              <Image
                key={currentTab.id}
                src={currentTab.image}
                alt={currentTab.heading}
                width={794}
                height={448}
                className="w-full h-auto object-cover rounded-sm transition-opacity duration-300"
              />
            </div>
          </div>
        </div>

        {/* Customer Quote Card */}
        <div className="bg-palette-7/30 border border-palette-1 rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-background shadow-2xs shrink-0 bg-palette-7">
            <Image
              src="/images/59-sarah-chen.webp"
              alt="Sarah Chen"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-serif text-lg font-normal italic leading-[1.4] text-equally-action-color mb-2">
              &ldquo;BrandLens makes things easy. All the files and versions are in the same place. The clients really appreciate the ease of use and being able to have a clear overview of their projects and compliance trail.&rdquo;
            </p>
            <p className="font-sans text-base leading-[1.4]">
              <span className="font-bold text-equally-action-color">Sarah Chen</span> — <span className="text-text-muted">Copy Director/Medical Director, Publicis Health France</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
