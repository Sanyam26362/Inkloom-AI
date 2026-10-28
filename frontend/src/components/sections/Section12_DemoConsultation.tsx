"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import Image from "next/image";

export function Section12_DemoConsultation() {
  const { openAuthModal } = useApp();
  const perks = [
    "Personal analysis of your existing approval process and guideline rules",
    "Live insight into the Inkloom AI platform and its pgvector RAG pipeline",
    "Hands-on demonstration of reverse-offset PII scrubbing for confidential text",
    "Role-based governance setup for Creators, Reviewers, and Brand Managers",
    "GDPR-compliant, ISO 27001-certified architecture with audit-ready logging",
  ];

  return (
    <section id="demo" className="py-20 bg-palette-7/30 font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="bg-background rounded-sm border border-border shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left Column: Demo Information */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14">
            <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color mb-4">
              See how Inkloom AI can make your approvals stress-free in just 30 minutes!
            </h2>

            <p className="font-sans text-base leading-[1.4] text-text-muted mb-6">
              Enjoy a free, non-binding consultation with our experts, tailored to your team.
            </p>

            <h4 className="font-sans text-base font-bold leading-[1.4] text-equally-action-color mb-3">
              Advantages of the 30-minute demo:
            </h4>

            <ul className="space-y-3 mb-8">
              {perks.map((perk, idx) => (
                <li key={idx} className="flex items-start gap-3 font-sans text-base leading-[1.4] text-text-primary">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="w-full sm:w-auto flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-background bg-primary hover:bg-[#004578] rounded-full cursor-pointer transition-all duration-300 shadow-sm"
              >
                Start Now
              </button>
              <Link
                href="/audit"
                className="w-full sm:w-auto flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-primary border-2 border-primary rounded-full hover:bg-blue-50/60 transition-all duration-300 cursor-pointer"
              >
                Audit Workspace
              </Link>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="lg:col-span-5 h-full relative min-h-[320px] lg:min-h-full bg-palette-7/50 flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-[420px] rounded-sm overflow-hidden shadow-sm border border-border">
              <Image
                src="/images/16-book-a-demo-with-our-sales-team-1024x787.webp"
                alt="Book a demo with the Inkloom AI team"
                width={500}
                height={384}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
