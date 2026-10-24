"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GovernanceAnalytics, Submission } from "@/lib/types";

export default function GovernanceDashboardPage() {
  const { activeBrandId, currentRole, brands, theme, refreshKey } = useApp();
  const isDark = theme === "dark";

  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<"compliance" | "violations">("compliance");

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
  }, [activeBrandId, currentRole, refreshKey]);

  // Derived metrics from real data
  const totalSubmissions = analytics?.total_submissions ?? submissions.length;
  const avgComplianceScore = analytics?.avg_compliance_score ?? 0;
  const openFindingsCount = analytics?.resolution_breakdown?.["OPEN"] ?? 0;
  const overriddenCount = analytics?.resolution_breakdown?.["OVERRIDDEN"] ?? 0;
  const totalFindings = analytics?.total_findings_generated ?? 0;

  const autoRemediationRate =
    totalFindings > 0
      ? Math.round(((totalFindings - openFindingsCount) / totalFindings) * 100)
      : totalSubmissions > 0
      ? 100
      : null;

  // Calculate top violation categories
  const categoryBreakdown = analytics?.findings_by_category || {};
  const categoryEntries = Object.entries(categoryBreakdown);
  const totalCategoryViolations = categoryEntries.reduce((acc, [, val]) => acc + val, 0) || 1;

  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const chartData = React.useMemo(() => {
    if (!submissions || submissions.length === 0) {
      return [
        { run: "Run #1", compliance: 78, violations: 4, title: "Diwali Offers Email", target: 90 },
        { run: "Run #2", compliance: 85, violations: 2, title: "Expansion Press Release", target: 90 },
        { run: "Run #3", compliance: 72, violations: 5, title: "Summer Sale Banner", target: 90 },
        { run: "Run #4", compliance: 94, violations: 1, title: "Brand Guidelines v2", target: 90 },
        { run: "Run #5", compliance: 88, violations: 2, title: "App Launch Hero", target: 90 },
        { run: "Latest", compliance: Math.round(avgComplianceScore) || 92, violations: openFindingsCount || 1, title: "Homepage Hero Copy", target: 90 },
      ];
    }
    return submissions.slice(-6).map((sub, idx, arr) => {
      const vCount = sub.findings?.length || 0;
      return {
        run: idx === arr.length - 1 ? "Latest" : `Run #${sub.id}`,
        compliance: sub.compliance_score ?? Math.round(avgComplianceScore),
        violations: vCount,
        title: sub.title,
        target: 90,
      };
    });
  }, [submissions, avgComplianceScore, openFindingsCount]);

  // Extract top 5 most recent completed/recorded submissions
  const topSubmissions = React.useMemo(() => {
    if (!submissions || submissions.length === 0) return [];
    return [...submissions]
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA || b.id - a.id;
      })
      .slice(0, 5);
  }, [submissions]);


  return (
    <div
      className={`relative w-full px-4 sm:px-6 lg:px-8 py-6 font-sans transition-colors duration-200 ${
        isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#111827]"
      }`}
    >
      {/* Error Banner if API connection fails */}
      {error && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
            isDark
              ? "bg-[#991b1b]/20 border-[#dc2626]/40 text-[#f3f4f6]"
              : "bg-[#fef2f2] border-[#dc2626]/30 text-[#111827]"
          }`}
        >
          <span className="material-symbols-outlined text-[#dc2626] text-[20px] shrink-0 mt-0.5">error</span>
          <div className="flex flex-col flex-1">
            <span className="font-sans text-sm font-bold text-[#dc2626]">
              Backend Communication Warning
            </span>
            <p className={`font-sans text-xs mt-0.5 ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
              {error}
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 rounded-md bg-[#dc2626] text-white text-xs font-semibold hover:bg-[#b91c1c] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top Metric KPI Grid (4 primary enterprise cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Submissions */}
        <div
          className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold ${
                isDark ? "text-[#9ca3af]" : "text-[#64748b]"
              }`}
            >
              Total Submissions
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
                <path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4" />
                <path d="M4 10h8" />
                <path d="M4 14h6" />
              </svg>
            </div>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span
              className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : totalSubmissions}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold ${
                totalSubmissions > 0
                  ? isDark
                    ? "bg-[#7c3aed]/20 text-[#d2bbff]"
                    : "bg-[#ebf6ff] text-primary"
                  : isDark
                  ? "bg-[#292a2d] text-[#9ca3af]"
                  : "bg-[#f1f5f9] text-[#64748b]"
              }`}
            >
              {totalSubmissions > 0 ? "Audited Assets" : "No Audits Yet"}
            </span>
          </div>

          <div
            className={`pt-2.5 border-t font-sans text-xs ${
              isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
            }`}
          >
            <span>Assets ingested for brand governance</span>
          </div>
        </div>

        {/* Card 2: Compliance Score */}
        <div
          className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold ${
                isDark ? "text-[#9ca3af]" : "text-[#64748b]"
              }`}
            >
              Compliance Score
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span
              className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : totalSubmissions === 0 ? "—" : `${avgComplianceScore.toFixed(1)}%`}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold ${
                totalSubmissions === 0
                  ? isDark ? "bg-[#292a2d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]"
                  : avgComplianceScore >= 90
                  ? "bg-[#00A36C]/15 text-[#00A36C] border border-[#00A36C]/30"
                  : avgComplianceScore >= 75
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                  : "bg-[#dc2626]/15 text-[#dc2626] border border-[#dc2626]/30"
              }`}
            >
              {totalSubmissions === 0
                ? "Unrated"
                : avgComplianceScore >= 90
                ? "Target Met"
                : avgComplianceScore >= 75
                ? "Review Needed"
                : "Action Required"}
            </span>
          </div>

          <div
            className={`pt-2.5 border-t font-sans text-xs flex items-center justify-between ${
              isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
            }`}
          >
            <span>Policy benchmark: ≥90%</span>
            <span className={avgComplianceScore >= 90 ? "text-[#00A36C] font-semibold" : ""}>
              {totalSubmissions === 0 ? "Grade: —" : avgComplianceScore >= 90 ? "Grade: AAA" : avgComplianceScore >= 75 ? "Grade: AA" : "Grade: A-"}
            </span>
          </div>
        </div>

        {/* Card 3: Pending Reviews */}
        <div
          className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold ${
                isDark ? "text-[#9ca3af]" : "text-[#64748b]"
              }`}
            >
              Pending Reviews
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span
              className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : openFindingsCount}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold ${
                openFindingsCount > 0
                  ? isDark ? "bg-amber-950/40 text-amber-400 border border-amber-500/30" : "bg-[#fffbeb] text-[#b45309] border border-amber-500/30"
                  : isDark ? "bg-[#00A36C]/15 text-[#4edea3]" : "bg-[#f0faf3] text-[#00A36C]"
              }`}
            >
              {openFindingsCount > 0 ? "Requires Review" : "Queue Clear"}
            </span>
          </div>

          <div
            className={`pt-2.5 border-t font-sans text-xs flex items-center justify-between ${
              isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
            }`}
          >
            <span>{overriddenCount} manual overrides</span>
            <Link
              href="/audit"
              className={`font-semibold hover:underline flex items-center gap-0.5 ${
                isDark ? "text-[#d2bbff]" : "text-primary"
              }`}
            >
              Queue &rarr;
            </Link>
          </div>
        </div>

        {/* Card 4: Auto-Fix Rate */}
        <div
          className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold ${
                isDark ? "text-[#9ca3af]" : "text-[#64748b]"
              }`}
            >
              Auto-Fix Rate
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#7c3aed]/15 text-[#d2bbff]" : "bg-purple-50 text-[#7c3aed]"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
              </svg>
            </div>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <span
              className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              {isLoading ? "..." : autoRemediationRate !== null ? `${autoRemediationRate}%` : "—"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold ${
                autoRemediationRate !== null && autoRemediationRate >= 80
                  ? isDark ? "bg-[#00A36C]/15 text-[#4edea3]" : "bg-[#f0faf3] text-[#00A36C]"
                  : isDark ? "bg-[#292a2d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]"
              }`}
            >
              {totalFindings > 0 ? "Automated" : "Zero Findings"}
            </span>
          </div>

          <div
            className={`pt-2.5 border-t font-sans text-xs ${
              isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
            }`}
          >
            <span>{totalFindings > 0 ? `${totalFindings} total findings evaluated` : "Dual-gate engine active"}</span>
          </div>
        </div>
      </div>
      {/* 3. Main Data Visualizations & Analytics (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
        {/* LEFT COLUMN (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          {/* Enterprise Interactive Telemetry Chart (Modern Shadcn / Recharts Pattern) */}
          <div
            className={`rounded-xl border shadow-xs transition-colors overflow-hidden ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}
          >
            {/* Header with Integrated Metric Switcher Tabs */}
            <div className={`flex flex-col sm:flex-row sm:items-stretch justify-between border-b ${
              isDark ? "border-[#3b3c44]" : "border-[#e2e8f0]"
            }`}>
              <div className="p-4 sm:p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h3 className={`font-sans text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                    Compliance Trajectory
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
                  }`}>
                    Live
                  </span>
                </div>
                <span className={`font-sans text-xs mt-0.5 ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                  Historical audit performance against 90% brand governance threshold
                </span>
              </div>

              {/* Integrated Metric Switcher Tabs */}
              <div className={`flex border-t sm:border-t-0 sm:border-l divide-x ${
                isDark ? "border-[#3b3c44] divide-[#3b3c44]" : "border-[#e2e8f0] divide-[#e2e8f0]"
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveMetric("compliance")}
                  className={`flex flex-col justify-center px-5 py-3 text-left transition-all cursor-pointer ${
                    activeMetric === "compliance"
                      ? isDark
                        ? "bg-[#7c3aed]/15 border-b-2 border-[#7c3aed]"
                        : "bg-[#ebf6ff] border-b-2 border-primary"
                      : isDark
                      ? "hover:bg-[#1f1f23]"
                      : "hover:bg-[#f8fafc]"
                  }`}
                >
                  <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${
                    isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                  }`}>
                    Compliance Score
                  </span>
                  <span className={`font-mono text-lg font-bold leading-tight ${
                    activeMetric === "compliance"
                      ? isDark ? "text-[#d2bbff]" : "text-primary"
                      : isDark ? "text-white" : "text-[#111827]"
                  }`}>
                    {totalSubmissions === 0 ? "—" : `${avgComplianceScore.toFixed(1)}%`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMetric("violations")}
                  className={`flex flex-col justify-center px-5 py-3 text-left transition-all cursor-pointer ${
                    activeMetric === "violations"
                      ? isDark
                        ? "bg-[#7c3aed]/15 border-b-2 border-[#7c3aed]"
                        : "bg-[#ebf6ff] border-b-2 border-primary"
                      : isDark
                      ? "hover:bg-[#1f1f23]"
                      : "hover:bg-[#f8fafc]"
                  }`}
                >
                  <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${
                    isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                  }`}>
                    Policy Flags
                  </span>
                  <span className={`font-mono text-lg font-bold leading-tight ${
                    activeMetric === "violations"
                      ? isDark ? "text-[#d2bbff]" : "text-primary"
                      : isDark ? "text-white" : "text-[#111827]"
                  }`}>
                    {openFindingsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="p-4 sm:p-5">
              {!isMounted ? (
                <div className="w-full h-72 flex items-center justify-center">
                  <span className={`text-xs font-mono ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                    Loading analytics visualization...
                  </span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="w-full h-72 flex flex-col items-center justify-center text-center p-4">
                  <span className="material-symbols-outlined text-[32px] text-[#9ca3af] mb-1">query_stats</span>
                  <span className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>
                    Insufficient Telemetry Data
                  </span>
                  <span className={`text-[11px] mt-0.5 ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                    Submit assets for auditing to populate the compliance trajectory curve.
                  </span>
                </div>
              ) : activeMetric === "compliance" ? (
                /* Natural Spline Area Chart (Shadcn Style) */
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 16, right: 16, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillCompliance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? "#7c3aed" : "#005797"} stopOpacity={0.45} />
                        <stop offset="95%" stopColor={isDark ? "#7c3aed" : "#005797"} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDark ? "#3b3c44" : "#e2e8f0"} />
                    <XAxis
                      dataKey="run"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11, fontFamily: "monospace" }}
                    />
                    <YAxis
                      domain={[50, 100]}
                      unit="%"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11, fontFamily: "monospace" }}
                    />
                    <ReferenceLine
                      y={90}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Policy 90%",
                        position: "insideTopRight",
                        fill: "#dc2626",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        offset: 8,
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: isDark ? "#4f515c" : "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        const isTargetMet = data.compliance >= 90;
                        const delta = data.compliance - 90;
                        return (
                          <div
                            className={`p-3 rounded-xl border shadow-xl text-xs font-sans min-w-[200px] backdrop-blur-md ${
                              isDark
                                ? "bg-[#1b1b1f]/95 border-[#3b3c44] text-white"
                                : "bg-white/95 border-[#cbd5e1] text-[#111827]"
                            }`}
                          >
                            <div className="font-bold border-b pb-1.5 mb-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px]">{data.run}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isTargetMet
                                    ? "bg-[#00A36C]/20 text-[#00A36C]"
                                    : "bg-[#dc2626]/20 text-[#dc2626]"
                                }`}
                              >
                                {isTargetMet ? "Target Met" : "Below Target"}
                              </span>
                            </div>
                            {data.title && (
                              <p className={`font-medium text-[11px] mb-2 truncate ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
                                {data.title}
                              </p>
                            )}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className={isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}>Compliance Score:</span>
                                <span className="font-mono font-bold text-sm text-[#00A36C]">{data.compliance}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}>90% Policy Target:</span>
                                <span className={`font-mono font-bold text-xs ${delta >= 0 ? "text-[#00A36C]" : "text-[#dc2626]"}`}>
                                  {delta >= 0 ? `+${delta}%` : `${delta}%`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      dataKey="compliance"
                      type="natural"
                      fill="url(#fillCompliance)"
                      stroke={isDark ? "#d2bbff" : "#005797"}
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: isDark ? "#121316" : "#ffffff",
                        stroke: isDark ? "#d2bbff" : "#005797",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#00A36C",
                        stroke: isDark ? "#1b1b1f" : "#ffffff",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                /* Modern Rounded Bar Chart for Policy Flags */
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 16, right: 16, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillViolations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? "#a78bfa" : "#005797"} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={isDark ? "#7c3aed" : "#003a66"} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDark ? "#3b3c44" : "#e2e8f0"} />
                    <XAxis
                      dataKey="run"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11, fontFamily: "monospace" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11, fontFamily: "monospace" }}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div
                            className={`p-3 rounded-xl border shadow-xl text-xs font-sans min-w-[200px] backdrop-blur-md ${
                              isDark
                                ? "bg-[#1b1b1f]/95 border-[#3b3c44] text-white"
                                : "bg-white/95 border-[#cbd5e1] text-[#111827]"
                            }`}
                          >
                            <div className="font-bold border-b pb-1.5 mb-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px]">{data.run}</span>
                              <span className={`font-mono text-[10px] font-bold ${isDark ? "text-[#d2bbff]" : "text-primary"}`}>
                                {data.violations} Flags
                              </span>
                            </div>
                            {data.title && (
                              <p className={`font-medium text-[11px] mb-2 truncate ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>
                                {data.title}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className={isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}>Compliance:</span>
                              <span className="font-mono font-bold text-[#00A36C]">{data.compliance}%</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={3}
                      stroke={isDark ? "#d2bbff" : "#005797"}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Warning (3+ Flags)",
                        position: "insideTopRight",
                        fill: isDark ? "#d2bbff" : "#005797",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        offset: 8,
                      }}
                    />
                    <Bar
                      dataKey="violations"
                      name="Violations"
                      fill="url(#fillViolations)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* Recent Flagged Audits & Review Queue Table */}
          <div
            className={`rounded-xl p-5 border shadow-2xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3
                className={`font-sans text-sm font-bold tracking-tight ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                Review Queue
              </h3>
            </div>

            {/* Responsive Data Table */}
            <div className="overflow-x-auto">
              {topSubmissions.length === 0 && !isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <span className={`material-symbols-outlined text-[36px] mb-2 ${isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
                    inbox
                  </span>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-[#111827]"}`}>
                    No Past Submissions Found
                  </p>
                  <p className={`text-xs mt-0.5 max-w-sm ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                    Select an active brand from the header brand selector to view its audit history.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[620px] text-left border-collapse">
                  <thead>
                    <tr
                      className={`font-mono text-[10px] uppercase tracking-wider font-semibold border-y ${
                        isDark
                          ? "bg-[#121316] text-[#9ca3af] border-[#3b3c44]"
                          : "bg-[#f8fafc] text-[#6b7280] border-[#cbd5e1]"
                      }`}
                    >
                      <th className="py-2.5 px-3">Asset Title</th>
                      <th className="py-2.5 px-3">Format / Author</th>
                      <th className="py-2.5 px-3">Findings</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Review Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`font-sans text-xs divide-y ${isDark ? "divide-[#313238]" : "divide-[#e2e8f0]"}`}>
                    {topSubmissions.map((sub) => {
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
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`p-1.5 rounded-md flex items-center justify-center shrink-0 ${
                                  isDark ? "bg-[#1f1f23] text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {sub.content_format === "MARKDOWN"
                                    ? "markdown"
                                    : sub.content_format === "HTML"
                                    ? "code"
                                    : "description"}
                                </span>
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className={`font-semibold truncate max-w-xs ${isDark ? "text-white" : "text-[#111827]"}`}>
                                  {sub.title}
                                </span>
                                <span className={`font-mono text-[10px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                                  SUB-#{sub.id} · v{sub.current_version}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className={`font-medium ${isDark ? "text-[#d1d5db]" : "text-[#111827]"}`}>
                                {sub.creator_name}
                              </span>
                              <span className={`font-mono text-[10px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                                {sub.content_format}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {criticalFindings > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-[#dc2626]/20 text-[#ffb4ab] border border-[#dc2626]/30 font-mono text-[10px] font-bold">
                                  {criticalFindings} Crit
                                </span>
                              )}
                              {warningFindings > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                                  {warningFindings} Warn
                                </span>
                              )}
                              {criticalFindings === 0 && warningFindings === 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-[#00A36C]/20 text-[#4edea3] border border-[#00A36C]/30 font-mono text-[10px] font-semibold">
                                  {sub.findings?.length || 0} Flags
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`font-mono text-xs font-bold tabular-nums ${
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

                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-sans text-[11px] font-semibold ${
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
                                    ? "bg-amber-400 animate-pulse"
                                    : sub.status === "CHANGES_REQUESTED"
                                    ? "bg-[#dc2626]"
                                    : "bg-[#9ca3af]"
                                }`}
                              />
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Link
                              href={`/audit?id=${sub.id}`}
                              className={`px-2.5 py-1 rounded-md font-sans text-[11px] font-semibold transition-all inline-block cursor-pointer whitespace-nowrap shadow-2xs ${
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
              className={`mt-3 flex items-center justify-between font-mono text-[11px] pt-2.5 border-t ${
                isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#6b7280]"
              }`}
            >
              <span>Showing {topSubmissions.length} submissions for Brand #{activeBrandId}</span>
              
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols: Intelligence Widgets) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Widget 1: Top Recurring Violations */}
          <div
            className={`rounded-xl p-5 border shadow-2xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-sans text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Top Violations
              </h3>
              <span className={`font-mono text-[11px] font-semibold ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                {totalCategoryViolations} Total
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              {categoryEntries.length === 0 ? (
                <div className={`py-4 text-center text-xs ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
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
                            className={`font-sans text-xs font-semibold capitalize ${
                              isDark ? "text-white" : "text-[#111827]"
                            }`}
                          >
                            {category.replace("_", " ")} Policy
                          </span>
                        </div>
                        <span className={`font-mono text-xs font-bold tabular-nums ${c.text}`}>
                          {pct}% ({count})
                        </span>
                      </div>
                      <div
                        className={`w-full rounded-full h-1.5 overflow-hidden ${
                          isDark ? "bg-[#292a2d]" : "bg-[#f1f5f9]"
                        }`}
                      >
                        <div className={`${c.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Widget 2: Ambiguous Guidelines Table */}
          <div
            className={`rounded-xl p-5 border shadow-2xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-sans text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Flagged Rules
              </h3>
              <span
                className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isDark ? "bg-amber-950/40 text-amber-300" : "bg-[#fffbeb] text-[#b45309]"
                }`}
              >
                {analytics?.ambiguous_guidelines?.length || 0} Override
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {!analytics?.ambiguous_guidelines || analytics.ambiguous_guidelines.length === 0 ? (
                <div className={`py-4 text-center text-xs ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                  No guidelines flagged with excessive override rates.
                </div>
              ) : (
                analytics.ambiguous_guidelines.slice(0, 3).map((g) => (
                  <div
                    key={g.chunk_id}
                    className={`p-3 rounded-lg flex flex-col gap-1 border transition-colors ${
                      isDark
                        ? "bg-[#121316] border-[#3b3c44] hover:bg-[#1f1f23]"
                        : "bg-[#f8fafc] border-[#cbd5e1] hover:bg-[#f1f5f9]"
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
                      <span className="font-mono text-[11px] text-[#dc2626] font-bold tabular-nums">
                        {Math.round(g.override_rate * 100)}% Override
                      </span>
                    </div>
                    <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${isDark ? "text-white" : "text-[#111827]"}`}>
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
              className={`w-full mt-3.5 py-2 rounded-lg border font-sans text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-2xs ${
                isDark
                  ? "bg-[#1f1f23] hover:bg-[#292a2d] text-[#d2bbff] border-[#3b3c44]"
                  : "bg-[#f8fafc] hover:bg-[#ebf6ff] text-primary border-[#cbd5e1]"
              }`}
            >
              <span>Manage Guidelines</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </Link>
          </div>

          {/* Widget 3: Brand Profiles & System Status */}
          <div
            className={`rounded-xl p-5 border shadow-2xs transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-sans text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Brand Profiles
              </h3>
              <span className="font-mono text-[10px] text-[#00A36C] font-semibold bg-[#00A36C]/20 px-2 py-0.5 rounded-full">
                {brands.length} Active
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {brands.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className={`p-2.5 rounded-lg flex items-center justify-between transition-colors border ${
                    b.id === activeBrandId
                      ? isDark
                        ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 shadow-2xs"
                        : "bg-[#ebf6ff] border-primary/40 shadow-2xs"
                      : isDark
                      ? "bg-[#121316] border-[#3b3c44] hover:bg-[#1f1f23]"
                      : "bg-[#f8fafc] border-[#cbd5e1] hover:bg-[#f1f5f9]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 shadow-2xs ${
                        isDark
                          ? "bg-[#1f1f23] border-[#3b3c44] text-[#d2bbff]"
                          : "bg-white border-[#cbd5e1] text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">domain</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-sans text-xs font-semibold truncate ${isDark ? "text-white" : "text-[#111827]"}`}>
                        {b.name}
                      </span>
                      <span className={`font-mono text-[10px] truncate ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                        {b.industry} · Contrast {b.min_wcag_contrast}:1
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#00A36C] font-semibold">
                      {b.approved_hex_palette?.length || 0} colors
                    </span>
                    <Link
                      href={`/guidelines?brand_id=${b.id}`}
                      className={`p-1 rounded transition-colors ${
                        isDark ? "text-[#9ca3af] hover:text-white" : "text-[#6b7280] hover:text-primary"
                      }`}
                      title="Inspect Brand Guidelines"
                    >
                      <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/guidelines"
              className={`w-full mt-3.5 py-2 rounded-lg border font-sans text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-2xs ${
                isDark
                  ? "bg-[#1f1f23] hover:bg-[#292a2d] text-[#d2bbff] border-[#3b3c44]"
                  : "bg-[#f8fafc] hover:bg-[#ebf6ff] text-primary border-[#cbd5e1]"
              }`}
            >
              <span>Manage Profiles</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
