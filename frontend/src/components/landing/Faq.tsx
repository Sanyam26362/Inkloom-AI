"use client";

import React, { useState } from "react";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What can Inkloom AI audit?",
      a: "Text, social posts, images, audio and video, each against your own brand guidelines.",
    },
    {
      q: "How do you know my brand rules?",
      a: "You upload your guideline document. Inkloom turns it into a ruleset that you can review and edit before it goes live.",
    },
    {
      q: "Can reviewers disagree with the AI?",
      a: "Yes. They can accept a fix or override a finding, but an override requires a written reason that is stored in the audit trail.",
    },
    {
      q: "What happens if the AI is unavailable?",
      a: "The system is fail-closed: the asset is held for review. It is never silently approved.",
    },
    {
      q: "Does Inkloom replace our reviewers?",
      a: "No. It does the repetitive checking so reviewers can spend time on judgement calls.",
    },
    {
      q: "How is our content protected?",
      a: "Access is role-based, sessions are authenticated, and personal data is scrubbed before content is sent to the model.",
    },
    {
      q: "Which compliance certifications do you hold?",
      a: "We are early-stage and do not claim certifications we haven't earned. SOC 2 and SSO are on our roadmap, and we are happy to complete your security questionnaire.",
    },
    {
      q: "How long does onboarding take?",
      a: "Most teams can upload guidelines and run their first audit in a single session. (Confirm before publishing.)",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1000px] mx-auto">
        <span className="nb-eyebrow mb-6">FAQ</span>

        <h2 id="faq-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          QUESTIONS WE GET ASKED.
        </h2>

        {/* Accessible Accordion */}
        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="nb-card bg-white overflow-hidden shadow-[4px_4px_0_var(--nb-ink)] transition-all"
              >
                <button
                  type="button"
                  id={`faq-btn-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--nb-yellow)]/30 transition-colors"
                >
                  <span className="nb-mono text-base sm:text-lg font-bold text-[var(--nb-ink)]">
                    {faq.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-none bg-[var(--nb-cream)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-base shrink-0 select-none shadow-[2px_2px_0_var(--nb-ink)]"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-btn-${index}`}
                    className="px-5 sm:px-6 pb-6 pt-2 border-t-2 border-[var(--nb-ink)] border-dashed bg-[#faf7f2]"
                  >
                    <p className="nb-mono text-sm sm:text-base leading-relaxed text-[var(--nb-ink)] font-medium">
                      {faq.a}
                    </p>
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
