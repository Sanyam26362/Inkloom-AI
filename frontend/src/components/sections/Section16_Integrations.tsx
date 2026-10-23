"use client";

import React from "react";

export function Section16_Integrations() {
  const categories = [
    {
      title: "Project management",
      desc: "Assign review tasks to your teammates and track file statuses in Asana, Jira, Monday.com, ClickUp, and Trello.",
      badge: "Workflow Sync",
      apps: ["Asana", "Jira", "Monday", "ClickUp", "Trello"],
    },
    {
      title: "Messenger",
      desc: "Share files, comments, and review decisions in your favorite channels with Slack and Microsoft Teams.",
      badge: "Real-time Alerts",
      apps: ["Slack", "Microsoft Teams", "Email", "Webhooks"],
    },
    {
      title: "Content creation",
      desc: "Upload files and see comments directly inside Adobe Creative Cloud, Figma, and Canva to iterate faster.",
      badge: "Native Plugins",
      apps: ["Adobe Premiere", "Photoshop", "InDesign", "Figma"],
    },
    {
      title: "And many more!",
      desc: "Connect Filestage with over 5,000+ applications through Zapier, Make, and our enterprise REST API.",
      badge: "Custom APIs",
      apps: ["Zapier", "Make", "REST API", "Google Drive"],
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 max-w-[800px] mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#005797] text-xs font-bold uppercase tracking-wider mb-3">
            Ecosystem & APIs
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25] mb-4">
            Fits seamlessly into your team’s existing workflow
          </h2>
          <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-relaxed">
            Connect Filestage with your project management, creative, and collaboration tools so approvals stay in sync across your entire workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-[#f9fafb] border border-gray-200/80 hover:bg-white hover:border-[#005797]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-['Lato',sans-serif] text-xl font-bold text-[#111827]">
                    {cat.title}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100/60 text-[#005797]">
                    {cat.badge}
                  </span>
                </div>
                <p className="font-['Lato',sans-serif] text-sm sm:text-base text-[#4b5563] leading-relaxed mb-6">
                  {cat.desc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200/60">
                {cat.apps.map((app, aIdx) => (
                  <span
                    key={aIdx}
                    className="text-xs font-medium px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-2xs"
                  >
                    {app}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
