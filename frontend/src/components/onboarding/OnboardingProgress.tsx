"use client";

import React from "react";

interface StepItem {
  num: number;
  label: string;
}

interface OnboardingProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  isDark?: boolean;
}

export function OnboardingProgress({
  currentStep,
  onStepClick,
}: OnboardingProgressProps) {
  const steps: StepItem[] = [
    { num: 1, label: "Select Client" },
    { num: 2, label: "Ingest Guidelines" },
    { num: 3, label: "Review Rules" },

  ];

  return (
    <nav
      aria-label="Onboarding Wizard Progress"
      className="w-full max-w-2xl mx-auto px-4 pt-6 pb-2"
    >
      <div className="relative flex items-center justify-between">
        {/* Continuous Connecting Line behind circles */}
        <div
          className="absolute top-4 left-6 right-6 h-[2px] bg-slate-200 dark:bg-slate-700 -z-0"
          aria-hidden="true"
        />

        {steps.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;

          return (
            <div
              key={step.num}
              className="relative z-10 flex flex-col items-center group"
            >
              <button
                type="button"
                disabled={!isCompleted && !isActive}
                onClick={() => isCompleted && onStepClick?.(step.num)}
                aria-current={isActive ? "step" : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-[#635BFF] text-white ring-4 ring-[#635BFF]/15 shadow-sm scale-105"
                    : isCompleted
                    ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600 shadow-2xs"
                    : "bg-white dark:bg-[#1a1b22] border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{step.num}</span>
                )}
              </button>

              <span
                className={`mt-2 text-xs transition-colors select-none ${
                  isActive
                    ? "font-bold text-[#635BFF] dark:text-[#8179ff]"
                    : isCompleted
                    ? "font-medium text-slate-600 dark:text-slate-300"
                    : "font-medium text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
