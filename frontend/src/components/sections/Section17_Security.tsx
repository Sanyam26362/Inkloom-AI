"use client";

import React from "react";
import Image from "next/image";

export function Section17_Security() {
  const securityFeatures = [
    {
      title: "Reverse-Offset PII Scrubber",
      desc: "Masks emails, phone numbers, and internal secrets locally before invoking external model endpoints.",
    },
    {
      title: "Anti-Prompt-Injection Fences",
      desc: "Strict delimiter isolation prevents adversarial collateral copy from hijacking audit instructions.",
    },
    {
      title: "Role-Based Access Control (RBAC)",
      desc: "Fine-grained permissions enforce distinct actions across Creator, Reviewer, and Brand Manager roles.",
    },
    {
      title: "Immutable Event History",
      desc: "Every revision, finding resolution, and manager override is preserved in an audit-ready database log.",
    },
  ];

  return (
    <section className="py-20 bg-[#fafafa] border-y border-gray-200/80">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Security Details */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
              Confidentiality &amp; Architecture
            </span>

            <h2 className="font-['Domine',serif] text-2xl sm:text-[34px] font-bold text-[#111827] leading-[1.25] mb-4">
              Audit corporate collateral with zero data leak risk
            </h2>

            <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-relaxed mb-8">
              Inkloom AI protects corporate secrets with built-in reverse-offset PII scrubbers. Sensitive credentials, internal pricing, and customer records never leave your infrastructure without explicit redaction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mb-8">
              {securityFeatures.map((feat, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-gray-200/70 shadow-2xs">
                  <div className="flex items-center gap-2 mb-1.5 text-[#005797]">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h4 className="font-['Lato',sans-serif] text-sm font-bold text-[#111827]">
                      {feat.title}
                    </h4>
                  </div>
                  <p className="font-['Lato',sans-serif] text-xs text-[#4b5563] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-[#005797] font-['Lato',sans-serif] text-base font-bold">
              <span>Zero external token consumption for deterministic checks</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          {/* Right Column: Security Badges & Certifications */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-gray-200/90 shadow-lg text-center">
            <h3 className="font-['Domine',serif] text-xl font-bold text-[#111827] mb-6">
              Enterprise Governance Assurance
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center w-36 h-28">
                <Image
                  src="/images/21-iso-iec-27001-2022-png.webp"
                  alt="ISO 27001 Certified"
                  width={110}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center w-36 h-28">
                <Image
                  src="/images/22-2603-296308-aas-soc-2-seal-png.webp"
                  alt="AICPA SOC 2 Type II"
                  width={100}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center w-36 h-28">
                <Image
                  src="/images/40-gdpr-png.webp"
                  alt="GDPR Compliant"
                  width={100}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>
            </div>

            <p className="font-['Lato',sans-serif] text-xs text-gray-500 max-w-[340px]">
              Every API call enforces strict schema validation and parameter sanitization to guarantee enterprise-level security.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
