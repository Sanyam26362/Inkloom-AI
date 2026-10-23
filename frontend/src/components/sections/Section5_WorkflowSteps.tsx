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
      "✓ Upload once, share instantly across formats",
      "✓ Eliminate version confusion & multi-channel drift",
      "✓ Keep copy & video reels compliance-ready",
    ],
    image: "/images/12-upload-any-file.webp",
    alt: "Upload any collateral to Inkloom AI",
  },
  {
    id: 2,
    title: "2. Real-time computational policy audit",
    bullets: [
      "✓ In-memory regex checking for banned terms & preferred wording",
      "✓ pgvector cosine similarity matches brand guideline chunks",
      "✓ Instant 0-100 compliance score with severity-weighted deductions",
    ],
    image: "/images/13-collect-feedback-directly-on-the-file.webp",
    alt: "Execute brand compliance audit with Inkloom AI",
  },
  {
    id: 3,
    title: "3. Defensible approval & sign-off",
    bullets: [
      "✓ Resolve findings or override with mandatory review justifications",
      "✓ Role-based transitions (Creator, Reviewer, Brand Manager)",
      "✓ Permanent audit trail generated for enterprise record-keeping",
    ],
    image: "/images/14-track-status-in-real-time.webp",
    alt: "Defensible sign-off in Inkloom AI",
  },
];

export function Section5_WorkflowSteps() {
  const [activeStep, setActiveStep] = useState(1);
  const currentStepData = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <section className="mt-5 font-sans text-base leading-[1.4] text-text-primary bg-background">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="mb-8 text-left">
          <h2 className="mb-2.5 font-serif text-2xl leading-[1.2] text-text-primary font-bold">
            From collateral intake to approved publication in 3 simple steps
          </h2>
          <p className="font-sans text-base leading-[1.4] text-text-primary max-w-[750px]">
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
                  className={`relative p-8 font-sans text-base leading-[1.4] text-text-primary cursor-pointer rounded-sm border transition-all duration-300 ${
                    isActive
                      ? "bg-background border-primary shadow-sm ring-1 ring-primary/20"
                      : "bg-palette-7/60 border-border hover:bg-background hover:border-text-muted"
                  }`}
                >
                  <h3
                    className={`font-sans text-base font-bold leading-[1.4] mb-3 transition-colors ${
                      isActive ? "text-primary" : "text-text-primary"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <div className="space-y-2">
                    {step.bullets.map((b, i) => (
                      <p key={i} className="font-sans text-base font-normal leading-[1.4] text-text-primary">
                        {b}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Step Preview Graphic */}
          <div className="lg:col-span-7">
            <div className="relative rounded-sm overflow-hidden border border-border shadow-sm bg-background min-h-[380px] sm:min-h-[460px] flex items-center justify-center p-2">
              <Image
                key={currentStepData.id}
                src={currentStepData.image}
                alt={currentStepData.alt}
                width={800}
                height={600}
                className="w-full h-auto object-cover rounded-sm transition-opacity duration-300"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
