"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";

export function FinalCta() {
  const { openAuthModal } = useApp();

  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    company: "",
    role: "Marketing",
    teamSize: "11-50",
    governDetails: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = "Full name is required";
    }
    if (!formData.workEmail.trim()) {
      errs.workEmail = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail.trim())) {
      errs.workEmail = "Enter a valid email address";
    }
    if (!formData.company.trim()) {
      errs.company = "Company is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // TODO: connect to backend/CRM
    // Do not send data anywhere.
    setIsSubmitted(true);
  };

  return (
    <section
      id="demo"
      aria-labelledby="final-cta-heading"
      className="w-full bg-[var(--nb-pink)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="nb-eyebrow mb-6 bg-white px-2 py-0.5 border border-[var(--nb-ink)]">
            REQUEST A WALKTHROUGH
          </span>

          <h2 id="final-cta-heading" className="nb-h2 mb-6 text-[var(--nb-ink)]">
            STOP GUESSING. START GOVERNING.
          </h2>

          <p className="nb-mono text-base sm:text-lg text-[var(--nb-ink)] font-bold">
            See Inkloom AI audit your own content in a 30-minute walkthrough.
          </p>
        </div>

        {/* Demo Request Form & Alternatives Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* White Bordered Form Card (8 cols) */}
          <div className="lg:col-span-8 nb-card bg-white p-6 sm:p-10 shadow-[8px_8px_0_var(--nb-ink)]">
            {isSubmitted ? (
              <div
                role="status"
                aria-live="polite"
                className="p-8 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-green)] shadow-[4px_4px_0_var(--nb-ink)] flex flex-col gap-4 text-center"
              >
                <div className="w-12 h-12 bg-white border-[3px] border-[var(--nb-ink)] flex items-center justify-center font-black text-2xl mx-auto shadow-[2px_2px_0_var(--nb-ink)]">
                  ✓
                </div>
                <h3
                  className="text-2xl font-black uppercase text-[var(--nb-ink)]"
                  style={{ fontFamily: "var(--font-archivo), sans-serif" }}
                >
                  Request Received
                </h3>
                <p className="nb-mono text-base font-bold text-[var(--nb-ink)]">
                  Thanks. We&apos;ll be in touch within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                <div className="border-b-[3px] border-[var(--nb-ink)] pb-4 mb-2">
                  <span className="nb-mono text-sm font-bold uppercase tracking-wider text-[var(--nb-ink)]">
                    ENTERPRISE DEMO REQUEST FORM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="field-fullName"
                      className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)]"
                    >
                      Full name *
                    </label>
                    <input
                      id="field-fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Jane Doe"
                      className="nb-mono text-sm p-3 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-cream)] focus:bg-white text-[var(--nb-ink)]"
                    />
                    {errors.fullName && (
                      <span className="nb-mono text-xs font-bold text-[var(--nb-red)]">
                        {errors.fullName}
                      </span>
                    )}
                  </div>

                  {/* Work Email */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="field-workEmail"
                      className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)]"
                    >
                      Work email *
                    </label>
                    <input
                      id="field-workEmail"
                      type="email"
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      placeholder="jane@company.com"
                      className="nb-mono text-sm p-3 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-cream)] focus:bg-white text-[var(--nb-ink)]"
                    />
                    {errors.workEmail && (
                      <span className="nb-mono text-xs font-bold text-[var(--nb-red)]">
                        {errors.workEmail}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Company */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="field-company"
                      className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)]"
                    >
                      Company *
                    </label>
                    <input
                      id="field-company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Acme Corp"
                      className="nb-mono text-sm p-3 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-cream)] focus:bg-white text-[var(--nb-ink)]"
                    />
                    {errors.company && (
                      <span className="nb-mono text-xs font-bold text-[var(--nb-red)]">
                        {errors.company}
                      </span>
                    )}
                  </div>

                  {/* Role */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="field-role"
                      className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)]"
                    >
                      Role
                    </label>
                    <select
                      id="field-role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="nb-mono text-sm p-3 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-cream)] focus:bg-white text-[var(--nb-ink)]"
                    >
                      <option value="Marketing">Marketing</option>
                      <option value="Legal/Compliance">Legal/Compliance</option>
                      <option value="Creative">Creative</option>
                      <option value="Agency">Agency</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Team Size */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="field-teamSize"
                      className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)]"
                    >
                      Team size
                    </label>
                    <select
                      id="field-teamSize"
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="nb-mono text-sm p-3 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-cream)] focus:bg-white text-[var(--nb-ink)]"
                    >
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-1000">201-1000</option>
                      <option value="1000+">1000+</option>
                    </select>
                  </div>
                </div>

                {/* What do you want to govern? */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="field-governDetails"
                    className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)]"
                  >
                    What do you want to govern?
                  </label>
                  <textarea
                    id="field-governDetails"
                    rows={4}
                    value={formData.governDetails}
                    onChange={(e) => setFormData({ ...formData, governDetails: e.target.value })}
                    placeholder="Social posts, packaging claims, localized campaign videos..."
                    className="nb-mono text-sm p-3 border-[3px] border-[var(--nb-ink)] bg-[var(--nb-cream)] focus:bg-white text-[var(--nb-ink)] resize-y"
                  ></textarea>
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="nb-btn nb-btn-primary w-full sm:w-auto"
                  >
                    REQUEST MY DEMO →
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Beside/Alternative Option (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="nb-card bg-white p-6 sm:p-8 shadow-[6px_6px_0_var(--nb-ink)]">
              <span className="nb-mono text-xs font-bold uppercase tracking-wider text-[var(--nb-ink)] opacity-75 block mb-3">
                SELF-SERVE OPTION
              </span>
              <h3 className="nb-mono text-lg font-bold uppercase text-[var(--nb-ink)] mb-4 leading-snug">
                WANT TO TEST INKLOOM INSTANTLY?
              </h3>
              <p className="nb-mono text-sm text-[var(--nb-ink)] opacity-85 leading-relaxed mb-6 font-medium">
                Set up a sandbox workspace, upload your brand rules, and run live multi-modal checks right away.
              </p>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="w-full nb-btn nb-btn-accent"
              >
                OR START A FREE TRIAL
              </button>
            </div>

            <div className="nb-card-placeholder bg-white p-6 shadow-[4px_4px_0_var(--nb-ink)]">
              <span className="nb-mono text-xs font-bold bg-[var(--nb-yellow)] border border-[var(--nb-ink)] px-2 py-0.5 uppercase tracking-wider inline-block mb-3">
                DIRECT CONTACT
              </span>
              <p className="nb-mono text-sm font-bold text-[var(--nb-ink)] mb-1">
                Enterprise procurement & RFP inquiries:
              </p>
              <p className="nb-mono text-xs text-[var(--nb-ink)] opacity-80">
                governance@inkloom.ai
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
