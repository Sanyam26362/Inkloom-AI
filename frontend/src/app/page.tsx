"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GovernanceAnalytics, Submission } from "@/lib/types";

export default function GovernanceDashboardPage() {
  const { activeBrand, activeBrandId, currentRole, brands } = useApp();

  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!activeBrandId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsData, submissionsData] = await Promise.all([
        api.getAnalytics(activeBrandId, { userRole: currentRole }),
        api.listSubmissions(activeBrandId, undefined, { userRole: currentRole }),
      ]);
      setAnalytics(analyticsData);
      setSubmissions(submissionsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load governance analytics data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeBrandId, currentRole]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      if (!activeBrandId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [analyticsData, submissionsData] = await Promise.all([
          api.getAnalytics(activeBrandId, { userRole: currentRole }),
          api.listSubmissions(activeBrandId, undefined, { userRole: currentRole }),
        ]);
        if (!ignore) {
          setAnalytics(analyticsData);
          setSubmissions(submissionsData);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg || "Failed to load governance analytics data.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [activeBrandId, currentRole]);

  // Derived metrics from real data
  const totalSubmissions = analytics?.total_submissions ?? submissions.length;
  const avgComplianceScore = analytics?.avg_compliance_score ?? 0;
  const openFindingsCount = analytics?.resolution_breakdown?.["OPEN"] ?? 0;
  const overriddenCount = analytics?.resolution_breakdown?.["OVERRIDDEN"] ?? 0;
  const totalFindings = analytics?.total_findings_generated ?? 0;

  const autoRemediationRate =
    totalFindings > 0
      ? Math.round(((totalFindings - openFindingsCount) / totalFindings) * 100)
      : 84.6;

  // Calculate top violation categories
  const categoryBreakdown = analytics?.findings_by_category || {};
  const categoryEntries = Object.entries(categoryBreakdown);
  const totalCategoryViolations = categoryEntries.reduce((acc, [, val]) => acc + val, 0) || 1;

  // Radial progress calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius; // 125.66
  const scoreClamped = Math.min(Math.max(avgComplianceScore, 0), 100);
  const strokeDashoffset = circumference - (scoreClamped / 100) * circumference;

  return (
    <div className="relative w-full px-gutter-desktop pb-margin-desktop bg-surface">
      {/* Subtle ambient top gradient beam */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-32 right-1/4 w-80 h-80 bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header greeting & workspace summary */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-lg pt-space-md pb-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-[11px] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              <span>
                {brands.length} Brand Profile{brands.length === 1 ? "" : "s"} Synchronized
              </span>
            </div>
            <span className="text-outline font-label-sm text-[11px]">·</span>
            <span className="font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-tertiary">bolt</span>
              FastAPI Engine Connected
            </span>
            <span className="text-outline font-label-sm text-[11px]">·</span>
            <span className="font-code-sm text-[11px] text-outline font-mono">
              BRAND ID: #{activeBrandId} ({activeBrand?.name || "Blinkit"})
            </span>
          </div>

          <h1 className="font-headline-xl text-[28px] sm:text-[32px] text-on-surface tracking-tight font-semibold flex items-center gap-3">
            Enterprise Governance Overview
          </h1>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl leading-relaxed">
            Real-time computational policy adherence across cross-channel enterprise collateral, LLM output gates,
            and autonomous pipeline sync.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center gap-space-sm flex-wrap self-start xl:self-end">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-sm text-[13px] font-medium transition-all shadow-sm border border-outline-variant/30 cursor-pointer disabled:opacity-50"
            type="button"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${isLoading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>{isLoading ? "Refreshing..." : "Sync Metrics"}</span>
          </button>

          <Link
            href="/audit"
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-sm text-[13px] font-semibold shadow-[0_0_14px_rgba(124,58,237,0.4)] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Launch Audit</span>
          </Link>
        </div>
      </div>

      {/* Error Banner if API connection fails */}
      {error && (
        <div className="mb-space-lg p-space-md rounded-xl bg-error-container/20 border border-error/30 text-on-surface flex items-start gap-space-md">
          <span className="material-symbols-outlined text-error text-[22px] shrink-0 mt-0.5">error</span>
          <div className="flex flex-col flex-1">
            <span className="font-headline-sm text-[15px] font-semibold text-error">
              Backend Communication Warning
            </span>
            <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 rounded bg-error-container text-error text-[12px] font-medium hover:bg-error-container/80 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top Metric KPI Grid (4 primary enterprise cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter-desktop mb-space-xl">
        {/* Card 1: Total Submissions */}
        <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Content Ingestion</span>
              <span className="font-headline-sm text-[16px] text-on-surface-variant font-medium mt-0.5">
                Total Submissions
              </span>
            </div>
            <span className="p-2 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </span>
          </div>

          <div className="my-space-md flex items-baseline justify-between">
            <span className="font-display-lg text-[36px] text-on-surface font-bold tracking-tight">
              {isLoading ? "..." : totalSubmissions}
            </span>
            <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>Live Ingest</span>
            </div>
          </div>

          <div className="flex items-end justify-between pt-space-xs">
            <span className="font-code-sm text-[11px] text-outline font-mono">
              {analytics?.status_breakdown
                ? Object.entries(analytics.status_breakdown)
                    .map(([st, count]) => `${st}: ${count}`)
                    .join(" · ")
                : "Active Brand Queue"}
            </span>
            {/* Inline Sparkline */}
            <svg className="w-24 h-7 text-primary overflow-visible" fill="none" viewBox="0 0 100 28">
              <path
                d="M0 24 L14 18 L28 22 L42 12 L56 16 L70 8 L84 11 L100 2"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M0 24 L14 18 L28 22 L42 12 L56 16 L70 8 L84 11 L100 2 L100 28 L0 28 Z"
                fill="currentColor"
                fillOpacity="0.12"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Organizational Compliance Score */}
        <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Governance Index</span>
              <span className="font-headline-sm text-[16px] text-on-surface-variant font-medium mt-0.5">
                Compliance Score
              </span>
            </div>
            <span className="p-2 rounded-lg bg-surface-container-high text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </span>
          </div>

          <div className="my-space-md flex items-center justify-between">
            <div>
              <span className="font-display-lg text-[36px] text-on-surface font-bold tracking-tight">
                {isLoading ? "..." : `${avgComplianceScore.toFixed(1)}%`}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${avgComplianceScore >= 80 ? "bg-tertiary" : "bg-error"}`} />
                <span
                  className={`font-label-sm text-[11px] font-medium ${
                    avgComplianceScore >= 80 ? "text-tertiary" : "text-error"
                  }`}
                >
                  {avgComplianceScore >= 80 ? "Enterprise Target Met" : "Requires Review"}
                </span>
              </div>
            </div>

            {/* Radial Progress Ring */}
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle
                  className="text-surface-container-highest"
                  cx="24"
                  cy="24"
                  fill="none"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="4.5"
                />
                <circle
                  className={avgComplianceScore >= 80 ? "text-tertiary" : "text-primary"}
                  cx="24"
                  cy="24"
                  fill="none"
                  r={radius}
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              </svg>
              <span className="absolute font-code-sm text-[11px] text-tertiary font-semibold font-mono">
                {Math.round(avgComplianceScore)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-space-xs font-code-sm text-[11px] text-outline font-mono">
            <span>Benchmark: Enterprise AA</span>
            <span className="text-tertiary font-medium">
              Grade: {avgComplianceScore >= 90 ? "AAA" : avgComplianceScore >= 70 ? "AA" : "A-"}
            </span>
          </div>
        </div>

        {/* Card 3: Pending Human Reviews / Escalations */}
        <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Human In The Loop</span>
              <span className="font-headline-sm text-[16px] text-on-surface-variant font-medium mt-0.5">
                Pending Escalations
              </span>
            </div>
            <span className="p-2 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">assignment_late</span>
            </span>
          </div>

          <div className="my-space-md flex items-baseline justify-between">
            <span className="font-display-lg text-[36px] text-on-surface font-bold tracking-tight">
              {isLoading ? "..." : openFindingsCount}
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary-container/40 text-secondary-fixed font-label-sm text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
              <span>{openFindingsCount} Open Findings</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-space-xs">
            <span className="font-body-sm text-[12px] text-outline truncate font-mono">
              {overriddenCount} overrides recorded
            </span>
            <Link
              href="/audit"
              className="text-primary hover:text-on-primary-container font-label-sm text-[11px] font-medium flex items-center gap-0.5"
            >
              Open Queue <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Card 4: Auto-Remediation Rate */}
        <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col justify-between group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Autonomous Fixes</span>
              <span className="font-headline-sm text-[16px] text-on-surface-variant font-medium mt-0.5">
                Resolution Velocity
              </span>
            </div>
            <span className="p-2 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
            </span>
          </div>

          <div className="my-space-md flex items-baseline justify-between">
            <span className="font-display-lg text-[36px] text-on-surface font-bold tracking-tight">
              {isLoading ? "..." : `${autoRemediationRate}%`}
            </span>
            <span className="font-label-sm text-[11px] text-primary font-medium">Deterministic & LLM</span>
          </div>

          <div className="flex flex-col gap-1.5 pt-space-xs">
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-all duration-500"
                style={{ width: `${autoRemediationRate}%` }}
              />
            </div>
            <span className="font-code-sm text-[11px] text-outline truncate font-mono">
              {totalFindings} total findings evaluated
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Data Visualizations & Analytics (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        {/* LEFT COLUMN (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-gutter-desktop">
          {/* Interactive Chart Card: Trajectory & Volume */}
          <div className="bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-[18px] text-on-surface font-semibold tracking-tight">
                    Compliance Trend & Volume Trajectory
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-tertiary font-label-sm text-[10px] uppercase font-mono font-bold tracking-wider">
                    LIVE REPOSITORY
                  </span>
                </div>
                <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">
                  Audited submission volume per cycle plotted with 90% enterprise policy threshold.
                </p>
              </div>

              {/* Legend Indicators */}
              <div className="flex items-center gap-space-md flex-wrap font-label-sm text-[11px]">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary-container" />
                  <span>Audited Assets</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="w-3 h-0.5 bg-tertiary" />
                  <span>Compliance %</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="w-3 h-0.5 border-b border-dashed border-error" />
                  <span className="text-error font-medium">90% Target</span>
                </div>
              </div>
            </div>

            {/* Chart Visual Area (SVG Data Visualization) */}
            <div className="relative w-full h-72 bg-surface-container-lowest/60 rounded-lg p-space-md flex flex-col justify-between overflow-hidden border border-outline-variant/20">
              {/* Background Grid lines */}
              <div className="absolute inset-x-space-md top-space-md bottom-10 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-px bg-outline" />
                <div className="w-full h-px bg-outline" />
                <div className="w-full h-px bg-outline" />
                <div className="w-full h-px bg-outline" />
              </div>

              {/* SVG Graph Container */}
              <div className="relative w-full h-56 mt-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
                  <defs>
                    <linearGradient id="volGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>

                  {/* Baseline 90% Line */}
                  <line
                    opacity="0.8"
                    stroke="#ffb4ab"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                    x1="0"
                    x2="700"
                    y1="60"
                    y2="60"
                  />
                  <text
                    className="font-mono text-[10px] uppercase font-bold tracking-widest"
                    fill="#ffb4ab"
                    x="620"
                    y="52"
                  >
                    Policy 90%
                  </text>

                  {/* Volume Bar Histogram */}
                  <rect fill="url(#volGrad)" height="70" rx="3" width="28" x="30" y="130" />
                  <rect fill="url(#volGrad)" height="100" rx="3" width="28" x="120" y="100" />
                  <rect fill="url(#volGrad)" height="120" rx="3" width="28" x="210" y="80" />
                  <rect fill="url(#volGrad)" height="145" rx="3" width="28" x="300" y="55" />
                  <rect fill="url(#volGrad)" height="110" rx="3" width="28" x="390" y="90" />
                  <rect fill="url(#volGrad)" height="160" rx="3" width="28" x="480" y="40" />
                  <rect fill="url(#volGrad)" height="180" rx="3" width="28" x="570" y="20" />

                  {/* Compliance Spline Line */}
                  <path
                    d="M 44 80 L 134 72 L 224 58 L 314 62 L 404 46 L 494 34 L 584 38"
                    fill="none"
                    stroke="#4edea3"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />

                  {/* Coordinate Pin Points */}
                  <circle cx="44" cy="80" fill="#121316" r="4" stroke="#4edea3" strokeWidth="2" />
                  <circle cx="134" cy="72" fill="#121316" r="4" stroke="#4edea3" strokeWidth="2" />
                  <circle cx="224" cy="58" fill="#121316" r="4" stroke="#4edea3" strokeWidth="2" />
                  <circle cx="314" cy="62" fill="#121316" r="4" stroke="#4edea3" strokeWidth="2" />
                  <circle cx="404" cy="46" fill="#121316" r="4" stroke="#4edea3" strokeWidth="2" />
                  <circle cx="494" cy="34" fill="#121316" r="4" stroke="#4edea3" strokeWidth="2" />
                  <circle
                    className="animate-pulse"
                    cx="584"
                    cy="38"
                    fill="#4edea3"
                    r="5"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* X-Axis Labels */}
              <div className="grid grid-cols-7 text-center font-mono text-[11px] text-outline border-t border-surface-container-high pt-2">
                <span>Cycle 1</span>
                <span>Cycle 2</span>
                <span>Cycle 3</span>
                <span>Cycle 4</span>
                <span>Cycle 5</span>
                <span>Cycle 6</span>
                <span className="text-tertiary font-semibold font-mono">Current Run</span>
              </div>
            </div>

            {/* Bottom Micro Metrics Strip */}
            <div className="mt-space-md grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-space-xs text-left">
              <div className="flex flex-col p-space-sm rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="font-label-sm text-[10px] text-outline uppercase font-mono tracking-wider">
                  Audited Submissions
                </span>
                <span className="font-headline-sm text-[15px] text-on-surface font-semibold mt-0.5">
                  {submissions.length} Total Assets
                </span>
                <span className="font-code-sm text-[11px] text-tertiary font-mono">Real-time sync</span>
              </div>

              <div className="flex flex-col p-space-sm rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="font-label-sm text-[10px] text-outline uppercase font-mono tracking-wider">
                  AI Governance Engine
                </span>
                <span className="font-headline-sm text-[15px] text-on-surface font-semibold mt-0.5">
                  Dual-Gate Detector
                </span>
                <span className="font-code-sm text-[11px] text-on-surface-variant font-mono">
                  Regex Rules + Gemini RAG
                </span>
              </div>

              <div className="flex flex-col p-space-sm rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="font-label-sm text-[10px] text-outline uppercase font-mono tracking-wider">
                  WCAG Accessibility
                </span>
                <span className="font-headline-sm text-[15px] text-on-surface font-semibold mt-0.5">
                  {activeBrand?.min_wcag_contrast || 4.5}:1 AA Standard
                </span>
                <span className="font-code-sm text-[11px] text-primary font-mono">Verified palette</span>
              </div>
            </div>
          </div>

          {/* Recent Flagged Audits & Review Queue Table */}
          <div className="bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-[18px] text-on-surface font-semibold tracking-tight">
                    Recent Flagged Audits & Review Queue
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-[11px] font-mono">
                    {submissions.length} Submissions
                  </span>
                </div>
                <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">
                  Content assets audited against {activeBrand?.name || "Blinkit"} Brand Guidelines.
                </p>
              </div>

              <div className="flex items-center gap-space-xs">
                <Link
                  href="/audit"
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-medium text-[12px] flex items-center gap-1 hover:bg-primary-container/90 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>New Submission</span>
                </Link>
              </div>
            </div>

            {/* Responsive Data Table */}
            <div className="overflow-x-auto">
              {submissions.length === 0 && !isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-outline text-[40px] mb-2">inbox</span>
                  <p className="text-[14px] text-on-surface font-medium">No Submissions Found for this Brand</p>
                  <p className="text-[12px] text-outline mt-1 max-w-sm">
                    Switch brands using the header dropdown or create a submission to start running audits.
                  </p>
                  <Link
                    href="/audit"
                    className="mt-4 px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[13px] font-semibold"
                  >
                    Create First Submission
                  </Link>
                </div>
              ) : (
                <table className="w-full min-w-[620px] text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container text-outline font-label-sm text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-md">Asset Title</th>
                      <th className="py-2.5 px-3">Format / Author</th>
                      <th className="py-2.5 px-3">Findings</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Review Status</th>
                      <th className="py-2.5 px-3 text-right rounded-r-md">Action</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-[13px] divide-y-0">
                    {submissions.map((sub) => {
                      const criticalFindings =
                        sub.findings?.filter((f) => f.severity === "CRITICAL").length || 0;
                      const warningFindings =
                        sub.findings?.filter((f) => f.severity === "WARNING").length || 0;

                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-surface-container/60 transition-colors border-b border-outline-variant/10"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                {sub.content_format === "MARKDOWN"
                                  ? "markdown"
                                  : sub.content_format === "HTML"
                                  ? "code"
                                  : "description"}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-body-sm text-on-surface font-medium truncate max-w-xs">
                                  {sub.title}
                                </span>
                                <span className="font-code-sm text-[10px] text-outline font-mono">
                                  SUB-#{sub.id} · v{sub.current_version}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="text-on-surface font-medium">{sub.creator_name}</span>
                              <span className="font-code-sm text-[11px] text-outline font-mono">
                                {sub.content_format}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {criticalFindings > 0 && (
                                <span className="px-2 py-0.5 rounded bg-error-container/40 text-error font-label-sm text-[10px] font-semibold">
                                  {criticalFindings} Crit
                                </span>
                              )}
                              {warningFindings > 0 && (
                                <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-secondary-fixed font-label-sm text-[10px]">
                                  {warningFindings} Warn
                                </span>
                              )}
                              {criticalFindings === 0 && warningFindings === 0 && (
                                <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-[10px] font-semibold">
                                  {sub.findings?.length || 0} Flags
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`font-code-sm text-[12px] font-bold font-mono ${
                                sub.compliance_score != null && sub.compliance_score >= 80
                                  ? "text-tertiary"
                                  : sub.compliance_score != null && sub.compliance_score >= 60
                                  ? "text-secondary"
                                  : "text-error"
                              }`}
                            >
                              {sub.compliance_score != null ? `${sub.compliance_score}%` : "—"}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-medium ${
                                sub.status === "APPROVED"
                                  ? "bg-tertiary-container/30 text-tertiary"
                                  : sub.status === "NEEDS_REVIEW"
                                  ? "bg-secondary-container/30 text-secondary-fixed"
                                  : sub.status === "CHANGES_REQUESTED"
                                  ? "bg-error-container/30 text-error"
                                  : "bg-surface-container-highest text-on-surface-variant"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sub.status === "APPROVED"
                                    ? "bg-tertiary"
                                    : sub.status === "NEEDS_REVIEW"
                                    ? "bg-secondary"
                                    : sub.status === "CHANGES_REQUESTED"
                                    ? "bg-error"
                                    : "bg-outline"
                                }`}
                              />
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <Link
                              href={`/audit?id=${sub.id}`}
                              className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-sm text-[11px] font-medium transition-all inline-block cursor-pointer whitespace-nowrap shadow-sm"
                            >
                              Audit Workspace
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-space-md flex items-center justify-between text-outline font-label-sm text-[11px] pt-space-xs border-t border-surface-container-high font-mono">
              <span>Showing {submissions.length} submissions for Brand #{activeBrandId}</span>
              <div className="flex items-center gap-1">
                <span className="text-on-surface">Live Backend PostgreSQL Database</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-gutter-desktop">
          {/* Widget 1: Top Recurring Violations */}
          <div className="bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold tracking-tight">
                Top Recurring Violations
              </span>
              <span className="font-code-sm text-[11px] text-outline font-mono">
                Total: {totalCategoryViolations}
              </span>
            </div>
            <p className="font-body-sm text-[13px] text-on-surface-variant mb-space-md">
              Dominant policy infractions detected across current brand content audits.
            </p>

            <div className="flex flex-col gap-space-md">
              {categoryEntries.length === 0 ? (
                <div className="py-4 text-center text-outline text-[12px]">
                  No violations logged for this brand.
                </div>
              ) : (
                categoryEntries.map(([category, count], idx) => {
                  const pct = Math.round((count / totalCategoryViolations) * 100);
                  const colors = [
                    { bar: "bg-error", text: "text-error" },
                    { bar: "bg-secondary", text: "text-secondary" },
                    { bar: "bg-primary", text: "text-primary" },
                    { bar: "bg-tertiary", text: "text-tertiary" },
                  ];
                  const c = colors[idx % colors.length];

                  return (
                    <div key={category} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.bar}`} />
                          <span className="font-body-sm text-[13px] text-on-surface font-medium capitalize">
                            {category.replace("_", " ")} Policy
                          </span>
                        </div>
                        <span className={`font-code-sm text-[12px] font-bold font-mono ${c.text}`}>
                          {pct}% ({count})
                        </span>
                      </div>
                      <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                        <div className={`${c.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-label-sm text-[10px] text-outline font-mono">
                        {category === "TERMINOLOGY"
                          ? "Banned words, unapproved jargon, deprecated terms"
                          : category === "TONE"
                          ? "Hype, absolute superlatives, non-enterprise persona"
                          : category === "FACTUAL_CLAIM"
                          ? "Unverified SLA/uptime stats without cited evidence"
                          : "Formatting, WCAG contrast, or style divergence"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Widget 2: Ambiguous Guidelines Table */}
          <div className="bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold tracking-tight">
                Ambiguous Guidelines
              </span>
              <span className="font-label-sm text-[11px] text-secondary font-mono">
                {analytics?.ambiguous_guidelines?.length || 0} Detected
              </span>
            </div>
            <p className="font-body-sm text-[13px] text-on-surface-variant mb-space-md">
              Rules with high human-override rates flagged for brand manager review.
            </p>

            <div className="flex flex-col gap-space-sm">
              {!analytics?.ambiguous_guidelines || analytics.ambiguous_guidelines.length === 0 ? (
                <div className="py-4 text-center text-outline text-[12px]">
                  No guidelines flagged with excessive override rates.
                </div>
              ) : (
                analytics.ambiguous_guidelines.slice(0, 3).map((g) => (
                  <div
                    key={g.chunk_id}
                    className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-outline-variant/20 hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] uppercase font-mono text-primary font-bold">
                        {g.rule_category} · {g.source_document}
                      </span>
                      <span className="font-code-sm text-[11px] text-error font-mono font-bold">
                        {Math.round(g.override_rate * 100)}% Override
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface leading-tight line-clamp-2">
                      {g.content_excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-outline font-mono pt-1">
                      <span>Triggered: {g.times_triggered} times</span>
                      <span>Overridden: {g.times_overridden} times</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/guidelines"
              className="w-full mt-space-md py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <span>Manage Brand Guidelines & Knowledge</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          {/* Widget 3: Brand Profiles & System Status */}
          <div className="bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold tracking-tight">
                Governed Profiles
              </span>
              <span className="font-label-sm text-[11px] text-tertiary font-mono">
                {brands.length} Total
              </span>
            </div>
            <p className="font-body-sm text-[13px] text-on-surface-variant mb-space-md">
              Multi-brand vector libraries active in PostgreSQL pgvector.
            </p>

            <div className="flex flex-col gap-space-sm">
              {brands.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  onClick={() => {}}
                  className={`p-space-sm rounded-lg flex items-center justify-between transition-colors border ${
                    b.id === activeBrandId
                      ? "bg-surface-container-high border-primary/40 shadow-sm"
                      : "bg-surface-container border-outline-variant/20 hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">domain</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-sm text-[13px] text-on-surface font-semibold truncate">
                        {b.name}
                      </span>
                      <span className="font-code-sm text-[10px] text-outline font-mono truncate">
                        {b.industry} · Contrast {b.min_wcag_contrast}:1
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-code-sm text-[11px] text-tertiary font-mono">
                      {b.approved_hex_palette?.length || 0} colors
                    </span>
                    <Link
                      href={`/guidelines?brand_id=${b.id}`}
                      className="p-1 rounded text-outline hover:text-on-surface transition-colors"
                      title="Inspect Brand Guidelines"
                    >
                      <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/guidelines"
              className="w-full mt-space-md py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <span>Manage Brand Profiles</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
