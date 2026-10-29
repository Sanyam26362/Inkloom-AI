"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export function Pricing() {
  const { openAuthModal } = useApp();

  const handleBookDemo = () => {
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    } else {
      openAuthModal();
    }
  };

  const plans = [
    {
      name: "STARTER",
      price: "$[XX] / month",
      subtext: "For small teams getting started",
      features: [
        "1 brand ruleset",
        "Text and image audits",
        "Up to [N] audits per month",
        "3 users",
        "Email support",
      ],
      btnText: "START FREE TRIAL",
      btnAction: () => openAuthModal(),
      btnClass: "nb-btn-secondary",
      isPopular: false,
      cardBg: "bg-white",
    },
    {
      name: "GROWTH",
      price: "$[XX] / seat / month",
      subtext: "For teams shipping every week",
      features: [
        "Multiple rulesets",
        "Text, image, audio and video",
        "Governance console",
        "Roles and approvals",
        "Priority support",
      ],
      btnText: "BOOK A DEMO",
      btnAction: handleBookDemo,
      btnClass: "nb-btn-primary",
      isPopular: true,
      cardBg: "bg-[var(--nb-yellow)]",
    },
    {
      name: "ENTERPRISE",
      price: "Custom",
      subtext: "For regulated and global brands",
      features: [
        "Unlimited rulesets",
        "SSO (roadmap)",
        "Custom integrations",
        "Dedicated onboarding",
        "Security review support",
      ],
      btnText: "TALK TO US",
      btnAction: () => openAuthModal(),
      btnClass: "nb-btn-secondary",
      isPopular: false,
      cardBg: "bg-white",
    },
  ];

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">PRICING</span>

        <h2 id="pricing-heading" className="nb-h2 mb-4 text-[var(--nb-ink)]">
          PICK A PLAN. CHANGE IT LATER.
        </h2>

        <p className="nb-mono text-base sm:text-lg text-[var(--nb-ink)] opacity-90 font-medium mb-12 sm:mb-16">
          Illustrative pricing. Final plans are confirmed during your demo.
        </p>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`nb-card ${plan.cardBg} p-8 flex flex-col justify-between relative ${
                plan.isPopular
                  ? "shadow-[10px_10px_0_var(--nb-ink)] lg:-translate-y-3 border-[4px]"
                  : "shadow-[6px_6px_0_var(--nb-ink)]"
              }`}
            >
              {/* Popular Chip */}
              {plan.isPopular && (
                <div className="absolute -top-4 left-8">
                  <span className="nb-mono text-xs font-black bg-[var(--nb-pink)] text-[var(--nb-ink)] border-[3px] border-[var(--nb-ink)] px-3 py-1 uppercase tracking-wider shadow-[3px_3px_0_var(--nb-ink)]">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="border-b-[3px] border-[var(--nb-ink)] pb-6 mb-6">
                  <h3 className="nb-mono text-xl font-bold uppercase tracking-tight text-[var(--nb-ink)] mb-3">
                    {plan.name}
                  </h3>
                  <div
                    className="text-3xl sm:text-4xl font-black text-[var(--nb-ink)] tracking-tight mb-2"
                    style={{ fontFamily: "var(--font-archivo), sans-serif" }}
                  >
                    {plan.price}
                  </div>
                  <p className="nb-mono text-sm font-medium text-[var(--nb-ink)] opacity-80">
                    {plan.subtext}
                  </p>
                </div>

                {/* Features List */}
                <ul className="flex flex-col gap-3.5 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="nb-mono text-sm leading-relaxed text-[var(--nb-ink)] flex items-start gap-2.5 font-medium"
                    >
                      <span className="font-bold select-none text-[var(--nb-ink)]">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-6 border-t-2 border-[var(--nb-ink)] border-dashed">
                <button
                  type="button"
                  onClick={plan.btnAction}
                  className={`w-full nb-btn ${plan.btnClass}`}
                >
                  {plan.btnText}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
