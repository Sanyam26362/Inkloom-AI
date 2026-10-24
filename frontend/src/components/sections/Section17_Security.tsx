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
    <section className="py-20 bg-palette-7/30 border-y border-palette-1 font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Security Details */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color mb-4">
              Share content with confidence
            </h2>

            <p className="font-sans text-base leading-[1.4] text-text-primary mb-8">
              Inkloom AI protects your files with enterprise-grade security, including local reverse-offset PII scrubbers. Sensitive credentials, internal pricing, and customer records never leave your infrastructure without explicit redaction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mb-8">
              {securityFeatures.map((feat, idx) => (
                <div key={idx} className="p-5 rounded-sm bg-background border border-border shadow-2xs">
                  <div className="flex items-center gap-2 mb-1.5 text-primary">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h4 className="font-sans text-base font-bold leading-[1.4] text-equally-action-color">
                      {feat.title}
                    </h4>
                  </div>
                  <p className="font-sans text-xs leading-[1.4] text-text-muted">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-primary font-sans text-base font-bold leading-[1.4]">
              <span>Zero external token consumption for deterministic checks</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          {/* Right Column: Security Badges & Certifications */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 bg-background rounded-sm border border-border shadow-sm text-center">
            <h3 className="font-serif text-xl font-bold leading-[1.2] text-equally-action-color mb-6">
              Enterprise Governance Assurance
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
              <div className="p-4 bg-palette-7/60 rounded-sm border border-palette-1 flex items-center justify-center w-36 h-28">
                <Image
                  src="/images/21-iso-iec-27001-2022-png.webp"
                  alt="ISO 27001 Certified"
                  width={110}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>

              <div className="p-4 bg-palette-7/60 rounded-sm border border-palette-1 flex items-center justify-center w-36 h-28">
                <Image
                  src="/images/22-2603-296308-aas-soc-2-seal-png.webp"
                  alt="AICPA SOC 2 Type II"
                  width={100}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>

              <div className="p-4 bg-palette-7/60 rounded-sm border border-palette-1 flex items-center justify-center w-36 h-28">
                <Image
                  src="/images/40-gdpr-png.webp"
                  alt="GDPR Compliant"
                  width={100}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>
            </div>

            <p className="font-sans text-xs leading-[1.4] text-text-muted max-w-[340px]">
              Every API call enforces strict schema validation and parameter sanitization to guarantee enterprise-level security.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
