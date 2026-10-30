"use client";

import React from "react";
import Image from "next/image";

export function Section7_AiUpgrade() {
  const features = [
    {
      title: "Deterministic Terminology & Claims",
      desc: "Instantly flags banned terms (e.g. 'instant', 'guaranteed') and auto-suggests approved brand phrasing.",
    },
    {
      title: "pgvector Semantic Guideline RAG",
      desc: "Uses 768-dimensional embeddings to retrieve exact company guidelines for tone, voice, and visual rules.",
    },
    {
      title: "Reverse-Offset PII Sanitizer",
      desc: "Local regex slicing replaces sensitive customer data, API keys, and phone numbers before model evaluation.",
    },
    {
      title: "Multi-Modal Audio & Video QA",
      desc: "Transcribes spoken dialogue and on-screen text to identify off-brand statements and regulatory risks.",
    },
  ];

  return (
    <section className="relative overflow-x-clip mt-5 mb-25 font-sans text-base leading-[1.4] text-text-primary bg-background">
      <div className="max-w-[1254px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: UI Mockup of AI comments */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative rounded-sm overflow-hidden border border-border shadow-sm bg-background p-2">
              <Image
                src="/images/15-ai-reviewer-comments-on-file.webp"
                alt="AI reviewer comments on file"
                width={562}
                height={422}
                className="w-full h-auto object-cover rounded-sm"
              />
            </div>
          </div>

          {/* Right Column: AI Feature List */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-start">
            <h2 className="shrink-0 font-serif text-2xl leading-[1.2] text-equally-action-color mb-4 font-bold">
              Enterprise brand governance, powered by AI &amp; deterministic rules
            </h2>

            <p className="font-sans text-base leading-[1.4] text-text-primary mb-6 max-w-[562px]">
              BrandLens evaluates copy, audio transcripts, and video frames against your active brand profile, approved claims, and industry disclaimers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {features.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1 p-4 rounded-sm bg-palette-7/40 border border-palette-1 hover:bg-background transition-colors">
                  <h4 className="font-sans text-base font-bold leading-[1.4] text-text-primary">
                    {item.title}
                  </h4>
                  <p className="font-sans text-base leading-[1.4] text-text-muted">
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
