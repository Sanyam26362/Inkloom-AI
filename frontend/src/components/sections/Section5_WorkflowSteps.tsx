"use client";

import React, { useState } from "react";
import Image from "next/image";

interface Step {
  id: number;
  title: string;
  bullets: string[];
  image: string;
  alt: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: "1. Upload copy & multi-modal media",
    bullets: [
      "Paste text, Markdown, HTML, or upload audio/video reels",
      "Automatic speech-to-text & on-screen visual dialogue extraction",
      "Reverse-offset PII scrubber masks sensitive entities locally",
    ],
    image: "/images/12-upload-any-file.webp",
    alt: "Upload any collateral to Inkloom AI",
  },
  {
    id: 2,
    title: "2. Real-time computational policy audit",
    bullets: [
      "In-memory regex matching for banned terms & preferred wording",
      "pgvector cosine similarity matches brand guideline chunks",
      "Calculates instant 0-100 compliance score with severity weights",
    ],
    image: "/images/13-collect-feedback-directly-on-the-file.webp",
    alt: "Execute brand compliance audit with Inkloom AI",
  },
  {
    id: 3,
    title: "3. Defensible approval & sign-off",
    bullets: [
      "Resolve findings or override with mandatory review justifications",
      "Role-based transitions (Creator, Reviewer, Brand Manager)",
      "Immutable audit log generated for enterprise record-keeping",
    ],
    image: "/images/14-track-status-in-real-time.webp",
    alt: "Defensible sign-off in Inkloom AI",
  },
];

export function Section5_WorkflowSteps() {
  const [activeStep, setActiveStep] = useState(1);
  const currentStepData = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="mb-12 text-left">
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.2] mb-3">
            From collateral intake to approved publication in 3 steps
          </h2>
          <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#374151] max-w-[750px]">
            Inkloom AI’s dual deterministic engine and pgvector RAG pipeline catches unapproved terminology, incorrect tone, and regulatory violations instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Interactive 3 Steps */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`p-6 sm:p-7 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-white border-[#005797] shadow-lg ring-1 ring-[#005797]/30"
                      : "bg-[#f9fafb] border-gray-200/80 hover:bg-white hover:border-gray-300 shadow-sm"
                  }`}
                >
                  <h3
                    className={`font-['Lato',sans-serif] text-xl font-bold mb-3 transition-colors ${
                      isActive ? "text-[#005797]" : "text-[#111827]"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <ul className="space-y-2">
                    {step.bullets.map((b, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm sm:text-base text-[#4b5563]">
                        <svg
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-[#005797]" : "text-gray-400"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Right Column: Step Preview Graphic */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white min-h-[380px] sm:min-h-[460px] flex items-center justify-center p-3">
              <Image
                key={currentStepData.id}
                src={currentStepData.image}
                alt={currentStepData.alt}
                width={800}
                height={600}
                className="w-full h-auto object-cover rounded-xl transition-opacity duration-300 animate-fadeIn"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
