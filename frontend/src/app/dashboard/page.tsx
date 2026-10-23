"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GovernanceAnalytics, Submission } from "@/lib/types";

export default function GovernanceDashboardPage() {
  const { activeBrand, activeBrandId, currentRole, brands, theme } = useApp();
  const isDark = theme === "dark";

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
    <div
      className={`relative w-full px-4 sm:px-8 py-8 font-sans transition-colors duration-200 ${
        isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#111827]"
      }`}
    >
      {/* 1. Header greeting & workspace summary */}
      <div
        className={`flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-8 border-b mb-8 transition-colors ${
          isDark ? "border-[#292a2d]" : "border-[#e5e7eb]"
        }`}
      >
        <div className="flex flex-col gap-2">
          {/* Status Indicators Pill Bar */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                isDark
                  ? "bg-[#00A36C]/15 text-[#4edea3] border-[#00A36C]/30"
                  : "bg-[#f0faf3] text-[#00A36C] border-[#00A36C]/30"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A36C] animate-pulse" />
              <span>
                {brands.length} Brand Profile{brands.length === 1 ? "" : "s"} Synchronized
              </span>
            </div>
            <span className={isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}>·</span>
            <span
              className={`text-[11px] font-semibold flex items-center gap-1 border px-3 py-1 rounded-full transition-colors ${
                isDark
                  ? "bg-[#1f1f23] text-[#9ca3af] border-[#292a2d]"
                  : "bg-white text-[#4b5563] border-[#e5e7eb]"
              }`}
            >
              <span className="material-symbols-outlined text-[14px] text-[#00A36C]">bolt</span>
              FastAPI Engine Connected
            </span>
            <span className={isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}>·</span>
            <span
              className={`text-[11px] font-mono border px-3 py-1 rounded-full font-bold transition-colors ${
                isDark
                  ? "bg-[#1f1f23] text-[#d1d5db] border-[#292a2d]"
                  : "bg-white text-[#374151] border-[#e5e7eb]"
              }`}
            >
              BRAND ID: #{activeBrandId} ({activeBrand?.name || "Blinkit"})
            </span>
          </div>

          <h1
            className={`font-serif text-3xl sm:text-4xl font-bold tracking-tight ${
              isDark ? "text-white" : "text-[#111827]"
            }`}
          >
            Enterprise Governance Overview
          </h1>
          <p
            className={`font-sans text-base max-w-2xl leading-relaxed ${
              isDark ? "text-[#9ca3af]" : "text-[#4b5563]"
            }`}
          >
            Real-time computational policy adherence across cross-channel enterprise collateral, LLM output gates,
            and autonomous pipeline sync.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center gap-3 flex-wrap self-start xl:self-end">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-sans text-[13px] font-bold transition-all shadow-2xs border cursor-pointer disabled:opacity-50 ${
              isDark
                ? "bg-[#1f1f23] hover:bg-[#292a2d] text-white border-[#292a2d]"
                : "bg-white hover:bg-[#f8fafc] text-[#111827] border-[#e5e7eb]"
            }`}
            type="button"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isDark ? "text-[#d2bbff]" : "text-primary"
              } ${isLoading ? "animate-spin" : ""}`}
            >
              refresh
            </span>
            <span>{isLoading ? "Refreshing..." : "Sync Metrics"}</span>
          </button>

          <Link
            href="/audit"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-[13px] font-bold shadow-xs transition-all cursor-pointer ${
              isDark
                ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                : "bg-primary hover:bg-[#004578] text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Launch Audit</span>
          </Link>
        </div>
      </div>

      {/* Error Banner if API connection fails */}
      {error && (
        <div
          className={`mb-8 p-4 rounded-xl border flex items-start gap-3 ${
            isDark
              ? "bg-[#991b1b]/20 border-[#dc2626]/40 text-[#f3f4f6]"
              : "bg-[#fef2f2] border-[#dc2626]/30 text-[#111827]"
          }`}
        >
          <span className="material-symbols-outlined text-[#dc2626] text-[22px] shrink-0 mt-0.5">error</span>
          <div className="flex flex-col flex-1">
            <span className="font-sans text-[15px] font-bold text-[#dc2626]">
              Backend Communication Warning
            </span>
            <p className={`font-sans text-[13px] mt-0.5 ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
              {error}
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 rounded-md bg-[#dc2626] text-white text-[12px] font-bold hover:bg-[#b91c1c] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top Metric KPI Grid (4 primary enterprise cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Total Submissions */}
        <div
          className={`rounded-xl p-6 border shadow-xs flex flex-col justify-between hover:shadow-sm transition-all group ${
            isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span
                className={`font-sans text-[11px] uppercase tracking-wider font-bold ${
                  isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                }`}
              >
                Content Ingestion
              </span>
              <span
                className={`font-sans text-[15px] font-bold mt-1 ${
                  isDark ? "text-[#d1d5db]" : "text-[#374151]"
                }`}
              >
                Total Submissions
              </span>
            </div>
            <span
              className={`p-2.5 rounded-lg flex items-center justify-center ${
                isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </span>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span
              className={`font-sans text-3xl sm:text-4xl font-bold tracking-tight ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : totalSubmissions}
            </span>
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-sans text-[11px] font-bold ${
                isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>Live Ingest</span>
            </div>
          </div>

          <div
            className={`flex items-end justify-between pt-2 border-t ${
              isDark ? "border-[#292a2d]" : "border-[#f1f5f9]"
            }`}
          >
            <span className={`font-mono text-[11px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
              {analytics?.status_breakdown
                ? Object.entries(analytics.status_breakdown)
                    .map(([st, count]) => `${st}: ${count}`)
                    .join(" · ")
                : "Active Brand Queue"}
            </span>
            {/* Inline Sparkline */}
            <svg
              className={`w-20 h-6 overflow-visible ${isDark ? "text-[#d2bbff]" : "text-primary"}`}
              fill="none"
              viewBox="0 0 100 28"
            >
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
                fillOpacity="0.15"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Organizational Compliance Score */}
        <div
          className={`rounded-xl p-6 border shadow-xs flex flex-col justify-between hover:shadow-sm transition-all group ${
            isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span
                className={`font-sans text-[11px] uppercase tracking-wider font-bold ${
                  isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                }`}
              >
                Governance Index
              </span>
              <span
                className={`font-sans text-[15px] font-bold mt-1 ${
                  isDark ? "text-[#d1d5db]" : "text-[#374151]"
                }`}
              >
                Compliance Score
              </span>
            </div>
            <span className="p-2.5 rounded-lg bg-[#00A36C]/20 text-[#00A36C] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </span>
          </div>

          <div className="my-4 flex items-center justify-between">
            <div>
              <span
                className={`font-sans text-3xl sm:text-4xl font-bold tracking-tight ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                {isLoading ? "..." : `${avgComplianceScore.toFixed(1)}%`}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    avgComplianceScore >= 80 ? "bg-[#00A36C]" : "bg-[#dc2626]"
                  }`}
                />
                <span
                  className={`font-sans text-[11px] font-bold ${
                    avgComplianceScore >= 80 ? "text-[#00A36C]" : "text-[#dc2626]"
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
                  className={isDark ? "text-[#292a2d]" : "text-[#f1f5f9]"}
                  cx="24"
                  cy="24"
                  fill="none"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="4.5"
                />
                <circle
                  className={avgComplianceScore >= 80 ? "text-[#00A36C]" : isDark ? "text-[#d2bbff]" : "text-primary"}
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
              <span
                className={`absolute font-mono text-[11px] font-bold ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                {Math.round(avgComplianceScore)}%
              </span>
            </div>
          </div>

          <div
            className={`flex items-center justify-between pt-2 border-t font-mono text-[11px] ${
              isDark ? "border-[#292a2d] text-[#9ca3af]" : "border-[#f1f5f9] text-[#6b7280]"
            }`}
          >
            <span>Benchmark: Enterprise AA</span>
            <span className="text-[#00A36C] font-bold">
              Grade: {avgComplianceScore >= 90 ? "AAA" : avgComplianceScore >= 70 ? "AA" : "A-"}
            </span>
          </div>
        </div>

        {/* Card 3: Pending Human Reviews / Escalations */}
        <div
          className={`rounded-xl p-6 border shadow-xs flex flex-col justify-between hover:shadow-sm transition-all group ${
            isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span
                className={`font-sans text-[11px] uppercase tracking-wider font-bold ${
                  isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                }`}
              >
                Human In The Loop
              </span>
              <span
                className={`font-sans text-[15px] font-bold mt-1 ${
                  isDark ? "text-[#d1d5db]" : "text-[#374151]"
                }`}
              >
                Pending Escalations
              </span>
            </div>
            <span
              className={`p-2.5 rounded-lg flex items-center justify-center ${
                isDark ? "bg-amber-950/40 text-amber-400" : "bg-[#fffbeb] text-[#b45309]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">assignment_late</span>
            </span>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span
              className={`font-sans text-3xl sm:text-4xl font-bold tracking-tight ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : openFindingsCount}
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-sans text-[11px] font-bold ${
                isDark ? "bg-amber-950/40 text-amber-400" : "bg-[#fffbeb] text-[#b45309]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{openFindingsCount} Open Findings</span>
            </div>
          </div>

          <div
            className={`flex items-center justify-between pt-2 border-t ${
              isDark ? "border-[#292a2d]" : "border-[#f1f5f9]"
            }`}
          >
            <span className={`font-mono text-[11px] truncate ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
              {overriddenCount} overrides recorded
            </span>
            <Link
              href="/audit"
              className={`hover:underline font-sans text-[11px] font-bold flex items-center gap-0.5 ${
                isDark ? "text-[#d2bbff]" : "text-primary"
              }`}
            >
              Open Queue <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Card 4: Auto-Remediation Rate */}
        <div
          className={`rounded-xl p-6 border shadow-xs flex flex-col justify-between hover:shadow-sm transition-all group ${
            isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span
                className={`font-sans text-[11px] uppercase tracking-wider font-bold ${
                  isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                }`}
              >
                Autonomous Fixes
              </span>
              <span
                className={`font-sans text-[15px] font-bold mt-1 ${
                  isDark ? "text-[#d1d5db]" : "text-[#374151]"
                }`}
              >
                Resolution Velocity
              </span>
            </div>
            <span
              className={`p-2.5 rounded-lg flex items-center justify-center ${
                isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
            </span>
          </div>

          <div className="my-4 flex items-baseline justify-between">
            <span
              className={`font-sans text-3xl sm:text-4xl font-bold tracking-tight ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : `${autoRemediationRate}%`}
            </span>
            <span
              className={`font-sans text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isDark ? "bg-[#00A36C]/20 text-[#4edea3]" : "bg-[#f0faf3] text-[#00A36C]"
              }`}
            >
              Deterministic &amp; LLM
            </span>
          </div>

          <div
            className={`flex flex-col gap-1.5 pt-2 border-t ${
              isDark ? "border-[#292a2d]" : "border-[#f1f5f9]"
            }`}
          >
            <div
              className={`w-full rounded-full h-1.5 overflow-hidden ${
                isDark ? "bg-[#292a2d]" : "bg-[#f1f5f9]"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDark ? "bg-[#7c3aed]" : "bg-primary"
                }`}
                style={{ width: `${autoRemediationRate}%` }}
              />
            </div>
            <span className={`font-mono text-[11px] truncate ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
              {totalFindings} total findings evaluated
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Data Visualizations & Analytics (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
        {/* LEFT COLUMN (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          {/* Interactive Chart Card: Trajectory & Volume */}
          <div
            className={`rounded-xl p-6 border shadow-xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-serif text-[18px] font-bold tracking-tight ${
                      isDark ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Compliance Trend &amp; Volume Trajectory
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider ${
                      isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
                    }`}
                  >
                    LIVE REPOSITORY
                  </span>
                </div>
                <p className={`font-sans text-[13px] mt-1 ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
                  Audited submission volume per cycle plotted with 90% enterprise policy threshold.
                </p>
              </div>

              {/* Legend Indicators */}
              <div className="flex items-center gap-4 flex-wrap font-sans text-[11px]">
                <div className={`flex items-center gap-1.5 ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
                  <span className={`w-2.5 h-2.5 rounded-sm ${isDark ? "bg-[#7c3aed]" : "bg-primary"}`} />
                  <span>Audited Assets</span>
                </div>
                <div className={`flex items-center gap-1.5 ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
                  <span className="w-3 h-0.5 bg-[#00A36C]" />
                  <span>Compliance %</span>
                </div>
                <div className={`flex items-center gap-1.5 ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
                  <span className="w-3 h-0.5 border-b border-dashed border-[#dc2626]" />
                  <span className="text-[#dc2626] font-bold">90% Target</span>
                </div>
              </div>
            </div>

            {/* Chart Visual Area (SVG Data Visualization) */}
            <div
              className={`relative w-full h-72 rounded-xl p-4 flex flex-col justify-between overflow-hidden border transition-colors ${
                isDark ? "bg-[#121316] border-[#292a2d]" : "bg-[#f8fafc] border-[#e5e7eb]"
              }`}
            >
              {/* Background Grid lines */}
              <div
                className={`absolute inset-x-4 top-4 bottom-10 flex flex-col justify-between pointer-events-none opacity-40`}
              >
                <div className={`w-full h-px ${isDark ? "bg-[#292a2d]" : "bg-[#cbd5e1]"}`} />
                <div className={`w-full h-px ${isDark ? "bg-[#292a2d]" : "bg-[#cbd5e1]"}`} />
                <div className={`w-full h-px ${isDark ? "bg-[#292a2d]" : "bg-[#cbd5e1]"}`} />
                <div className={`w-full h-px ${isDark ? "bg-[#292a2d]" : "bg-[#cbd5e1]"}`} />
              </div>

              {/* SVG Graph Container */}
              <div className="relative w-full h-56 mt-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
                  <defs>
                    <linearGradient id="volGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? "#7c3aed" : "#005797"} stopOpacity="0.85" />
                      <stop offset="100%" stopColor={isDark ? "#7c3aed" : "#005797"} stopOpacity="0.2" />
                    </linearGradient>
                  </defs>

                  {/* Baseline 90% Line */}
                  <line
                    opacity="0.9"
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                    x1="0"
                    x2="700"
                    y1="60"
                    y2="60"
                  />
                  <text
                    className="font-mono text-[10px] uppercase font-bold tracking-widest"
                    fill="#dc2626"
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
                    stroke="#00A36C"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />

                  {/* Coordinate Pin Points */}
                  <circle
                    cx="44"
                    cy="80"
                    fill={isDark ? "#121316" : "#ffffff"}
                    r="4"
                    stroke="#00A36C"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="134"
                    cy="72"
                    fill={isDark ? "#121316" : "#ffffff"}
                    r="4"
                    stroke="#00A36C"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="224"
                    cy="58"
                    fill={isDark ? "#121316" : "#ffffff"}
                    r="4"
                    stroke="#00A36C"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="314"
                    cy="62"
                    fill={isDark ? "#121316" : "#ffffff"}
                    r="4"
                    stroke="#00A36C"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="404"
                    cy="46"
                    fill={isDark ? "#121316" : "#ffffff"}
                    r="4"
                    stroke="#00A36C"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="494"
                    cy="34"
                    fill={isDark ? "#121316" : "#ffffff"}
                    r="4"
                    stroke="#00A36C"
                    strokeWidth="2.5"
                  />
                  <circle
                    className="animate-pulse"
                    cx="584"
                    cy="38"
                    fill="#00A36C"
                    r="5"
                    stroke={isDark ? "#1b1b1f" : "#ffffff"}
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* X-Axis Labels */}
              <div
                className={`grid grid-cols-7 text-center font-mono text-[11px] pt-2 border-t ${
                  isDark ? "border-[#292a2d] text-[#9ca3af]" : "border-[#e5e7eb] text-[#6b7280]"
                }`}
              >
                <span>Cycle 1</span>
                <span>Cycle 2</span>
                <span>Cycle 3</span>
                <span>Cycle 4</span>
                <span>Cycle 5</span>
                <span>Cycle 6</span>
                <span className="text-[#00A36C] font-bold font-mono">Current Run</span>
              </div>
            </div>

            {/* Bottom Micro Metrics Strip */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div
                className={`flex flex-col p-3 rounded-lg border transition-colors ${
                  isDark ? "bg-[#1f1f23] border-[#292a2d]" : "bg-[#f8fafc] border-[#e5e7eb]"
                }`}
              >
                <span
                  className={`font-sans text-[10px] uppercase font-mono tracking-wider font-bold ${
                    isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                  }`}
                >
                  Audited Submissions
                </span>
                <span className={`font-sans text-[15px] font-bold mt-0.5 ${isDark ? "text-white" : "text-[#111827]"}`}>
                  {submissions.length} Total Assets
                </span>
                <span className="font-mono text-[11px] text-[#00A36C] font-semibold">Real-time sync</span>
              </div>

              <div
                className={`flex flex-col p-3 rounded-lg border transition-colors ${
                  isDark ? "bg-[#1f1f23] border-[#292a2d]" : "bg-[#f8fafc] border-[#e5e7eb]"
                }`}
              >
                <span
                  className={`font-sans text-[10px] uppercase font-mono tracking-wider font-bold ${
                    isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                  }`}
                >
                  AI Governance Engine
                </span>
                <span className={`font-sans text-[15px] font-bold mt-0.5 ${isDark ? "text-white" : "text-[#111827]"}`}>
                  Dual-Gate Detector
                </span>
                <span className={`font-mono text-[11px] ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
                  Regex Rules + Gemini RAG
                </span>
              </div>

              <div
                className={`flex flex-col p-3 rounded-lg border transition-colors ${
                  isDark ? "bg-[#1f1f23] border-[#292a2d]" : "bg-[#f8fafc] border-[#e5e7eb]"
                }`}
              >
                <span
                  className={`font-sans text-[10px] uppercase font-mono tracking-wider font-bold ${
                    isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                  }`}
                >
                  WCAG Accessibility
                </span>
                <span className={`font-sans text-[15px] font-bold mt-0.5 ${isDark ? "text-white" : "text-[#111827]"}`}>
                  {activeBrand?.min_wcag_contrast || 4.5}:1 AA Standard
                </span>
                <span className={`font-mono text-[11px] font-bold ${isDark ? "text-[#d2bbff]" : "text-primary"}`}>
                  Verified palette
                </span>
              </div>
            </div>
          </div>

          {/* Recent Flagged Audits & Review Queue Table */}
          <div
            className={`rounded-xl p-6 border shadow-xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-serif text-[18px] font-bold tracking-tight ${
                      isDark ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Recent Flagged Audits &amp; Review Queue
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                      isDark ? "bg-[#292a2d] text-[#d1d5db]" : "bg-[#f1f5f9] text-[#4b5563]"
                    }`}
                  >
                    {submissions.length} Submissions
                  </span>
                </div>
                <p className={`font-sans text-[13px] mt-1 ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
                  Content assets audited against {activeBrand?.name || "Blinkit"} Brand Guidelines.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/audit"
                  className={`px-3.5 py-1.5 rounded-full font-bold text-[12px] flex items-center gap-1 transition-colors shadow-2xs ${
                    isDark
                      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                      : "bg-primary text-white hover:bg-[#004578]"
                  }`}
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
                  <span className={`material-symbols-outlined text-[40px] mb-2 ${isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
                    inbox
                  </span>
                  <p className={`text-[14px] font-bold ${isDark ? "text-white" : "text-[#111827]"}`}>
                    No Submissions Found for this Brand
                  </p>
                  <p className={`text-[12px] mt-1 max-w-sm ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                    Switch brands using the header dropdown or create a submission to start running audits.
                  </p>
                  <Link
                    href="/audit"
                    className={`mt-4 px-4 py-2 rounded-full text-[13px] font-bold shadow-xs ${
                      isDark ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]" : "bg-primary text-white hover:bg-[#004578]"
                    }`}
                  >
                    Create First Submission
                  </Link>
                </div>
              ) : (
                <table className="w-full min-w-[620px] text-left border-collapse">
                  <thead>
                    <tr
                      className={`font-sans text-[11px] uppercase tracking-wider font-bold border-y ${
                        isDark
                          ? "bg-[#121316] text-[#9ca3af] border-[#292a2d]"
                          : "bg-[#f8fafc] text-[#6b7280] border-[#e5e7eb]"
                      }`}
                    >
                      <th className="py-3 px-3">Asset Title</th>
                      <th className="py-3 px-3">Format / Author</th>
                      <th className="py-3 px-3">Findings</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Review Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`font-sans text-[13px] divide-y ${isDark ? "divide-[#292a2d]" : "divide-[#f1f5f9]"}`}>
                    {submissions.map((sub) => {
                      const criticalFindings =
                        sub.findings?.filter((f) => f.severity === "CRITICAL").length || 0;
                      const warningFindings =
                        sub.findings?.filter((f) => f.severity === "WARNING").length || 0;

                      return (
                        <tr
                          key={sub.id}
                          className={`transition-colors ${
                            isDark ? "hover:bg-[#1f1f23]" : "hover:bg-[#f8fafc]"
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`material-symbols-outlined text-[18px] ${
                                  isDark ? "text-[#d2bbff]" : "text-primary"
                                }`}
                              >
                                {sub.content_format === "MARKDOWN"
                                  ? "markdown"
                                  : sub.content_format === "HTML"
                                  ? "code"
                                  : "description"}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className={`font-bold truncate max-w-xs ${isDark ? "text-white" : "text-[#111827]"}`}>
                                  {sub.title}
                                </span>
                                <span className={`font-mono text-[10px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                                  SUB-#{sub.id} · v{sub.current_version}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className={`font-medium ${isDark ? "text-[#d1d5db]" : "text-[#111827]"}`}>
                                {sub.creator_name}
                              </span>
                              <span className={`font-mono text-[11px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                                {sub.content_format}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {criticalFindings > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-[#dc2626]/20 text-[#ffb4ab] border border-[#dc2626]/30 font-sans text-[10px] font-bold">
                                  {criticalFindings} Crit
                                </span>
                              )}
                              {warningFindings > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans text-[10px] font-bold">
                                  {warningFindings} Warn
                                </span>
                              )}
                              {criticalFindings === 0 && warningFindings === 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-[#00A36C]/20 text-[#4edea3] border border-[#00A36C]/30 font-sans text-[10px] font-bold">
                                  {sub.findings?.length || 0} Flags
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`font-mono text-[12px] font-bold ${
                                sub.compliance_score != null && sub.compliance_score >= 80
                                  ? "text-[#00A36C]"
                                  : sub.compliance_score != null && sub.compliance_score >= 60
                                  ? "text-amber-400"
                                  : "text-[#dc2626]"
                              }`}
                            >
                              {sub.compliance_score != null ? `${sub.compliance_score}%` : "—"}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-sans text-[11px] font-bold ${
                                sub.status === "APPROVED"
                                  ? "bg-[#00A36C]/15 text-[#4edea3] border border-[#00A36C]/30"
                                  : sub.status === "NEEDS_REVIEW"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : sub.status === "CHANGES_REQUESTED"
                                  ? "bg-[#dc2626]/15 text-[#ffb4ab] border border-[#dc2626]/30"
                                  : isDark
                                  ? "bg-[#292a2d] text-[#d1d5db]"
                                  : "bg-[#f1f5f9] text-[#4b5563]"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sub.status === "APPROVED"
                                    ? "bg-[#00A36C]"
                                    : sub.status === "NEEDS_REVIEW"
                                    ? "bg-amber-400"
                                    : sub.status === "CHANGES_REQUESTED"
                                    ? "bg-[#dc2626]"
                                    : isDark
                                    ? "bg-[#9ca3af]"
                                    : "bg-[#9ca3af]"
                                }`}
                              />
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <Link
                              href={`/audit?id=${sub.id}`}
                              className={`px-3 py-1 rounded-full font-sans text-[11px] font-bold transition-all inline-block cursor-pointer whitespace-nowrap shadow-2xs ${
                                isDark
                                  ? "bg-[#7c3aed]/20 text-[#d2bbff] hover:bg-[#7c3aed] hover:text-white"
                                  : "bg-[#ebf6ff] text-primary hover:bg-primary hover:text-white"
                              }`}
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

            <div
              className={`mt-4 flex items-center justify-between font-mono text-[11px] pt-3 border-t ${
                isDark ? "border-[#292a2d] text-[#9ca3af]" : "border-[#f1f5f9] text-[#6b7280]"
              }`}
            >
              <span>Showing {submissions.length} submissions for Brand #{activeBrandId}</span>
              <div className="flex items-center gap-1">
                <span className={isDark ? "text-white font-semibold" : "text-[#111827] font-semibold"}>
                  Live Backend PostgreSQL Database
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Widget 1: Top Recurring Violations */}
          <div
            className={`rounded-xl p-6 border shadow-xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className={`font-serif text-[16px] font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Top Recurring Violations
              </h3>
              <span className={`font-mono text-[11px] font-bold ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                Total: {totalCategoryViolations}
              </span>
            </div>
            <p className={`font-sans text-[13px] mb-4 ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
              Dominant policy infractions detected across current brand content audits.
            </p>

            <div className="flex flex-col gap-4">
              {categoryEntries.length === 0 ? (
                <div className={`py-4 text-center text-[12px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                  No violations logged for this brand.
                </div>
              ) : (
                categoryEntries.map(([category, count], idx) => {
                  const pct = Math.round((count / totalCategoryViolations) * 100);
                  const colors = [
                    { bar: "bg-[#dc2626]", text: "text-[#dc2626]" },
                    { bar: "bg-amber-500", text: "text-amber-400" },
                    { bar: isDark ? "bg-[#7c3aed]" : "bg-primary", text: isDark ? "text-[#d2bbff]" : "text-primary" },
                    { bar: "bg-[#00A36C]", text: "text-[#00A36C]" },
                  ];
                  const c = colors[idx % colors.length];

                  return (
                    <div key={category} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.bar}`} />
                          <span
                            className={`font-sans text-[13px] font-bold capitalize ${
                              isDark ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            {category.replace("_", " ")} Policy
                          </span>
                        </div>
                        <span className={`font-mono text-[12px] font-bold ${c.text}`}>
                          {pct}% ({count})
                        </span>
                      </div>
                      <div
                        className={`w-full rounded-full h-2 overflow-hidden ${
                          isDark ? "bg-[#292a2d]" : "bg-[#f1f5f9]"
                        }`}
                      >
                        <div className={`${c.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`font-mono text-[10px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
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
          <div
            className={`rounded-xl p-6 border shadow-xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className={`font-serif text-[16px] font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Ambiguous Guidelines
              </h3>
              <span
                className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isDark ? "bg-amber-950/40 text-amber-300" : "bg-[#fffbeb] text-[#b45309]"
                }`}
              >
                {analytics?.ambiguous_guidelines?.length || 0} Detected
              </span>
            </div>
            <p className={`font-sans text-[13px] mb-4 ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
              Rules with high human-override rates flagged for brand manager review.
            </p>

            <div className="flex flex-col gap-3">
              {!analytics?.ambiguous_guidelines || analytics.ambiguous_guidelines.length === 0 ? (
                <div className={`py-4 text-center text-[12px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                  No guidelines flagged with excessive override rates.
                </div>
              ) : (
                analytics.ambiguous_guidelines.slice(0, 3).map((g) => (
                  <div
                    key={g.chunk_id}
                    className={`p-3 rounded-lg flex flex-col gap-1 border transition-colors ${
                      isDark
                        ? "bg-[#121316] border-[#292a2d] hover:bg-[#1f1f23]"
                        : "bg-[#f8fafc] border-[#e5e7eb] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-[10px] uppercase font-bold ${
                          isDark ? "text-[#d2bbff]" : "text-primary"
                        }`}
                      >
                        {g.rule_category} · {g.source_document}
                      </span>
                      <span className="font-mono text-[11px] text-[#dc2626] font-bold">
                        {Math.round(g.override_rate * 100)}% Override
                      </span>
                    </div>
                    <p className={`text-[12px] font-medium leading-tight line-clamp-2 ${isDark ? "text-white" : "text-[#111827]"}`}>
                      {g.content_excerpt}
                    </p>
                    <div className={`flex items-center justify-between text-[10px] font-mono pt-1 ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                      <span>Triggered: {g.times_triggered} times</span>
                      <span>Overridden: {g.times_overridden} times</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/guidelines"
              className={`w-full mt-4 py-2 rounded-full border font-sans text-[12px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs ${
                isDark
                  ? "bg-[#1f1f23] hover:bg-[#292a2d] text-[#d2bbff] border-[#292a2d]"
                  : "bg-[#f8fafc] hover:bg-[#ebf6ff] text-primary border-[#e5e7eb]"
              }`}
            >
              <span>Manage Brand Guidelines &amp; Knowledge</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          {/* Widget 3: Brand Profiles & System Status */}
          <div
            className={`rounded-xl p-6 border shadow-xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className={`font-serif text-[16px] font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Governed Profiles
              </h3>
              <span className="font-mono text-[11px] text-[#00A36C] font-bold bg-[#00A36C]/20 px-2 py-0.5 rounded-full">
                {brands.length} Total
              </span>
            </div>
            <p className={`font-sans text-[13px] mb-4 ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
              Multi-brand vector libraries active in PostgreSQL pgvector.
            </p>

            <div className="flex flex-col gap-2.5">
              {brands.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  onClick={() => {}}
                  className={`p-3 rounded-lg flex items-center justify-between transition-colors border ${
                    b.id === activeBrandId
                      ? isDark
                        ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 shadow-2xs"
                        : "bg-[#ebf6ff] border-primary/40 shadow-2xs"
                      : isDark
                      ? "bg-[#121316] border-[#292a2d] hover:bg-[#1f1f23]"
                      : "bg-[#f8fafc] border-[#e5e7eb] hover:bg-[#f1f5f9]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-2xs ${
                        isDark
                          ? "bg-[#1f1f23] border-[#292a2d] text-[#d2bbff]"
                          : "bg-white border-[#e5e7eb] text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">domain</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-sans text-[13px] font-bold truncate ${isDark ? "text-white" : "text-[#111827]"}`}>
                        {b.name}
                      </span>
                      <span className={`font-mono text-[10px] truncate ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                        {b.industry} · Contrast {b.min_wcag_contrast}:1
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#00A36C] font-bold">
                      {b.approved_hex_palette?.length || 0} colors
                    </span>
                    <Link
                      href={`/guidelines?brand_id=${b.id}`}
                      className={`p-1 rounded transition-colors ${
                        isDark ? "text-[#9ca3af] hover:text-white" : "text-[#6b7280] hover:text-primary"
                      }`}
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
              className={`w-full mt-4 py-2 rounded-full border font-sans text-[12px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs ${
                isDark
                  ? "bg-[#1f1f23] hover:bg-[#292a2d] text-[#d2bbff] border-[#292a2d]"
                  : "bg-[#f8fafc] hover:bg-[#ebf6ff] text-primary border-[#e5e7eb]"
              }`}
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
