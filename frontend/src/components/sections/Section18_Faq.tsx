"use client";

import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is online proofing software and how does BrandLens work?",
    answer:
      "Online proofing software is a tool used to review and approve creative assets, including artwork, documents, videos, and audio. BrandLens adds computational governance: auditing marketing collateral, social captions, audio voiceovers, and video reels against brand guidelines, prohibited terminology, approved facts, and WCAG accessibility standards before publication.",
  },
  {
    question: "Who uses online proofing and brand governance platforms?",
    answer:
      "Creative and marketing teams of all sizes use online proofing software to speed up review cycles. BrandLens is designed for brands and agencies that produce high volumes of content, collaborate across multiple reviewers, and must maintain strict compliance.",
  },
  {
    question: "How does multi-modal auditing work for audio and video?",
    answer:
      "BrandLens automatically transcribes spoken dialogue and extracts meaningful on-screen text from audio files (MP3, WAV, AAC, FLAC) and video reels (MP4, MOV, WEBM). The transcript is structured into an editable revision with timestamp markers and audited directly against your brand rules.",
  },
  {
    question: "How does the reverse-offset PII scrubber protect confidential data?",
    answer:
      "Before sending content for semantic AI analysis, BrandLens’s in-memory regex scrubber replaces sensitive emails, phone numbers, API keys, and employee names with non-colliding tokens. After evaluation, original text entities are restored locally, ensuring confidential data never leaks to external providers.",
  },
  {
    question: "How is the 0–100 compliance score calculated?",
    answer:
      "Compliance scoring starts at 100 and applies deterministic deductions based on finding severity: -25 points for CRITICAL violations (banned claims, severe regulatory breaches), -10 points for WARNINGS (unapproved synonyms, contrast defects), and -3 points for SUGGESTIONS (minor tone polishing).",
  },
];

export function Section18_Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-background font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[860px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color">
            FAQs
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-border rounded-sm overflow-hidden bg-background shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer hover:bg-palette-7/30 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-sans text-base font-bold leading-[1.4] text-equally-action-color">
                    {faq.question}
                  </span>
                  <span className="ml-4 shrink-0 text-primary">
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
                  <div className="px-6 pb-6 pt-1 font-sans text-base leading-[1.4] text-text-primary border-t border-palette-1">
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
