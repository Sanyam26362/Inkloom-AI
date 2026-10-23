"use client";

import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is online proofing software?",
    answer:
      "Online proofing software is a web-based platform designed to review and approve creative assets, including documents, designs, videos, audio, and live websites. It provides a centralized collaboration space where stakeholders leave pinpoint comments, annotate directly on files, and submit formal sign-offs.",
  },
  {
    question: "Who uses online proofing software?",
    answer:
      "Creative and marketing teams of all sizes use online proofing software to speed up their approval cycles. It is widely adopted by enterprise brand managers, creative agencies, legal compliance reviewers, and video producers who need a clear audit trail and hassle-free stakeholder approvals.",
  },
  {
    question: "What are the main benefits of online proofing software?",
    answer:
      "The primary benefits include 30% faster approval turnarounds, eliminating version confusion, cutting down endless email chains, and preventing costly errors before publication. It creates an indisputable system of evidence for brand and legal compliance.",
  },
  {
    question: "What types of files can I review using online proofing software?",
    answer:
      "You can review virtually any format: PDFs, Microsoft Office documents, Adobe Creative Cloud files (images, vectors), high-definition video formats (MP4, MOV), audio stems, HTML5 banners, packaging die-cuts, and live interactive websites.",
  },
  {
    question: "How much does online proofing software cost?",
    answer:
      "Filestage provides a free trial with full feature access, transparent team tiers starting for growing agencies, and custom enterprise plans with dedicated support, custom SLAs, and advanced security configurations.",
  },
];

export function Section18_Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-[860px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#005797] text-xs font-bold uppercase tracking-wider mb-3">
            Common Questions
          </span>
          <h2 className="font-['Domine',serif] text-3xl sm:text-[36px] font-bold text-[#111827] leading-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-gray-200/90 rounded-2xl overflow-hidden transition-colors bg-white shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer hover:bg-gray-50/80 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-['Lato',sans-serif] text-lg sm:text-[19px] font-bold text-[#111827]">
                    {faq.question}
                  </span>
                  <span className="ml-4 shrink-0 text-[#005797]">
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-base text-[#4b5563] font-['Lato',sans-serif] leading-relaxed border-t border-gray-100 animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
