"use client";

import React from "react";
import Image from "next/image";

export function Section7_AiUpgrade() {
  const features = [
    {
      title: "Automated error detection",
      desc: "Catch typos, broken links, and technical issues before reviewers see them.",
      icon: "check_circle",
    },
    {
      title: "Brand guideline checks",
      desc: "Ensure every asset follows approved fonts, colors, logos, and tone of voice.",
      icon: "verified",
    },
    {
      title: "Compliance and risk detection",
      desc: "Catch regulatory issues, labeling mistakes, and high-risk content early.",
      icon: "gavel",
    },
    {
      title: "Context-aware suggestions",
      desc: "Get intelligent feedback tailored to your project and industry.",
      icon: "psychology",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: UI Mockup of AI comments */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl bg-white p-2">
              <Image
                src="/images/15-ai-reviewer-comments-on-file.webp"
                alt="AI reviewer comments on file"
                width={562}
                height={422}
                className="w-full h-auto object-cover rounded-xl"
              />
            </div>
          </div>

          {/* Right Column: AI Feature List */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-start">
            <span className="inline-block px-3.5 py-1 rounded-full bg-purple-50 text-purple-700 font-['Lato',sans-serif] text-xs font-bold uppercase tracking-wider mb-3">
              Automated Governance
            </span>

            <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25] mb-4">
              Your reviews just got an upgrade
            </h2>

            <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-relaxed mb-8">
              Review Agents scan creative assets for errors, brand inconsistencies, and compliance risks before reviewers even start.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {features.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#005797] flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <h4 className="font-['Lato',sans-serif] text-base font-bold text-[#111827]">
                    {item.title}
                  </h4>
                  <p className="font-['Lato',sans-serif] text-sm text-[#4b5563] leading-normal">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
