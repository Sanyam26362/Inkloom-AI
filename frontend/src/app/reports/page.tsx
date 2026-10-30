"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  GovernanceAnalytics,
  Submission,
  AdminStatsResponse,
  AmbiguousGuideline,
} from "@/lib/types";

// =====================================================================
// CSV EXPORT HELPER (RFC-4180 Compliant + Formula Injection Protected)
// =====================================================================
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Security: Prevent CSV / DDE formula injection (CWE-1236)
  // Prefix dangerous trigger symbols with a single quote so spreadsheets treat them as pure text.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape internal double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export default function ReportsAndAnalyticsPage() {
  const {
    activeBrandId,
    activeBrand,
    brands,
    currentRole,
    theme,
    refreshKey,
    setActiveBrandId,
    triggerRefresh,
  } = useApp();

  const isDark = theme === "dark";
  const activeBrandReady = activeBrandId > 0 && brands.some((b) => b.id === activeBrandId);

  // Permission Checks based on backend security policies:
  // - Brand analytics (GET /analytics/{brand_id}): All authenticated roles
  // - Admin stats (GET /admin/stats): Reviewer, Judge, Admin, Manager
  const isCreator = currentRole === "CREATOR";
  const isReviewerOrAdmin =
    currentRole === "ADMIN" ||
    currentRole === "JUDGE" ||
    currentRole === "REVIEWER" ||
    currentRole === "MANAGER";

  // Data States
  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States (Grounded in real submission timestamps and formats)
  const [dateFilter, setDateFilter] = useState<"ALL" | "7D" | "30D" | "90D">("ALL");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Recharts Hydration Guard for SSR
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // =====================================================================
  // DATA FETCHING (Strict role-scoped endpoints)
  // =====================================================================
  const loadReportData = useCallback(async () => {
    if (!activeBrandReady) {
      setIsLoading(brands.length === 0);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Brand Analytics & Submissions list (available to all roles)
      const [analyticsData, submissionsData] = await Promise.all([
        api.getAnalytics(activeBrandId, { userRole: currentRole }).catch((err) => {
          console.warn("Brand analytics fetch failed:", err);
          return null;
        }),
        api.listSubmissions(activeBrandId, undefined, { userRole: currentRole }).catch((err) => {
          console.warn("Submissions fetch failed:", err);
          return [] as Submission[];
        }),
      ]);

      // 2. Fetch Admin Stats ONLY for authorized roles (avoids 403 Forbidden for Creators)
      let statsData: AdminStatsResponse | null = null;
      if (isReviewerOrAdmin) {
        try {
          statsData = await api.getAdminStats({ userRole: currentRole });
        } catch (adminErr) {
          console.warn("Platform admin stats unavailable or unauthorized:", adminErr);
        }
      }

      setAnalytics(analyticsData);
      setSubmissions(submissionsData);
      setAdminStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load governance report data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeBrandId, activeBrandReady, brands.length, currentRole, isReviewerOrAdmin]);

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      loadReportData();
    }
    return () => {
      ignore = true;
    };
  }, [loadReportData, refreshKey]);

  // =====================================================================
  // FILTERED SUBMISSIONS (Grounded in real submission timestamps)
  // =====================================================================
  const filteredSubmissions = useMemo(() => {
    let list = [...submissions];

    // Format Filter
    if (formatFilter !== "ALL") {
      list = list.filter((s) => s.content_format?.toUpperCase() === formatFilter);
    }

    // Date Filter based on actual created_at ISO timestamp
    if (dateFilter !== "ALL") {
      const now = Date.now();
      const days = dateFilter === "7D" ? 7 : dateFilter === "30D" ? 30 : 90;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      list = list.filter((s) => {
        if (!s.created_at) return false;
        const time = new Date(s.created_at).getTime();
        return !isNaN(time) && time >= cutoff;
      });
    }

    // Sort chronologically descending
    return list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA || b.id - a.id;
    });
  }, [submissions, dateFilter, formatFilter]);

  // =====================================================================
  // DERIVED METRICS & KPIS
  // =====================================================================
  const totalSubmissionsInFilter = filteredSubmissions.length;
  const totalSubmissionsEver = analytics?.total_submissions ?? submissions.length;

  // Filtered Average Compliance Score
  const currentAvgScore = useMemo(() => {
    const scores = filteredSubmissions
      .map((s) => s.compliance_score)
      .filter((score): score is number => typeof score === "number" && !isNaN(score));
    if (scores.length > 0) {
      return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
    return analytics?.avg_compliance_score ?? 100.0;
  }, [filteredSubmissions, analytics?.avg_compliance_score]);

  // Approved Submissions
  const approvedSubmissions = useMemo(
    () =>
      filteredSubmissions.filter(
        (s) => s.status === "APPROVED" || s.verdict === "PASS"
      ),
    [filteredSubmissions]
  );

  // Rejected / Changes Requested
  const flaggedSubmissions = useMemo(
    () =>
      filteredSubmissions.filter(
        (s) =>
          s.status === "CHANGES_REQUESTED" ||
          s.status === "REJECTED" ||
          s.verdict === "FAIL"
      ),
    [filteredSubmissions]
  );

  // In Review
  const pendingReviewSubmissions = useMemo(
    () =>
      filteredSubmissions.filter(
        (s) =>
          s.status === "NEEDS_REVIEW" ||
          s.status === "AUDITING" ||
          s.status === "DRAFT" ||
          s.verdict === "NEEDS_REVIEW"
      ),
    [filteredSubmissions]
  );

  const passRate =
    totalSubmissionsInFilter > 0
      ? Math.round((approvedSubmissions.length / totalSubmissionsInFilter) * 1000) / 10
      : 100;

  // Ambiguous Guidelines (from backend AnalyticsService)
  const ambiguousGuidelines: AmbiguousGuideline[] = analytics?.ambiguous_guidelines || [];
  const flaggedAmbiguities = ambiguousGuidelines.filter((g) => g.ambiguity_flag);

  // Finding Distributions
  const severityCounts = analytics?.findings_by_severity || {};
  const categoryCounts = analytics?.findings_by_category || {};
  const totalFindings = analytics?.total_findings_generated || 0;

  // =====================================================================
  // RECHARTS COMPLIANCE TREND DATA (Chronological order)
  // =====================================================================
  const trendChartData = useMemo(() => {
    if (filteredSubmissions.length === 0) return [];
    // Show up to 12 recent submissions in ascending chronological order
    const chronological = [...filteredSubmissions].slice(0, 12).reverse();
    return chronological.map((sub, idx) => {
      const d = sub.created_at ? new Date(sub.created_at) : null;
      const formattedDate =
        d && !isNaN(d.getTime())
          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : `Run #${sub.id}`;

      return {
        runLabel: formattedDate,
        score: sub.compliance_score ?? 100,
        target: 85,
        title: sub.title || `Submission #${sub.id}`,
        verdict: sub.verdict || "PASS",
        creator: sub.creator_name || "Unknown",
        format: sub.content_format || "TEXT",
        id: sub.id,
      };
    });
  }, [filteredSubmissions]);

  // =====================================================================
  // CLIENT-SIDE CSV EXPORT (RFC-4180 + Injection Safe)
  // =====================================================================
  const handleExportCsv = useCallback(() => {
    if (filteredSubmissions.length === 0 && (!analytics || analytics.total_submissions === 0)) {
      setExportNotice("Notice: No submission data available to export for this selection.");
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const brandName = activeBrand?.name || `Brand-${activeBrandId}`;
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const dateStr = new Date().toISOString().slice(0, 10);
    const timestampStr = new Date().toISOString();

    const lines: string[] = [];

    // 1. Report Metadata Header
    lines.push("=== BrandLens Governance Report ===");
    lines.push(`Report Type,${escapeCsvValue("Compliance & Governance Audit Ledger")}`);
    lines.push(`Brand Name,${escapeCsvValue(brandName)}`);
    lines.push(`Brand ID,${escapeCsvValue(activeBrandId)}`);
    lines.push(`Exported At,${escapeCsvValue(timestampStr)}`);
    lines.push(`User Role,${escapeCsvValue(currentRole)}`);
    lines.push(`Date Filter,${escapeCsvValue(dateFilter)}`);
    lines.push(`Format Filter,${escapeCsvValue(formatFilter)}`);
    lines.push(`Average Compliance Score,${escapeCsvValue(`${currentAvgScore}%`)}`);
    lines.push(`Total Submissions in Scope,${escapeCsvValue(filteredSubmissions.length)}`);
    lines.push(`Compliance Pass Rate,${escapeCsvValue(`${passRate}%`)}`);
    lines.push("");

    // 2. Submissions Ledger
    lines.push("=== AUDITED SUBMISSIONS DETAIL LEDGER ===");
    lines.push(
      [
        "Submission ID",
        "Created At",
        "Title",
        "Creator",
        "Content Format",
        "Platform",
        "Compliance Score",
        "Verdict",
        "Review Status",
        "Version",
      ]
        .map(escapeCsvValue)
        .join(",")
    );

    filteredSubmissions.forEach((sub) => {
      lines.push(
        [
          sub.id,
          sub.created_at || "N/A",
          sub.title,
          sub.creator_name,
          sub.content_format,
          sub.platform || "GENERAL",
          sub.compliance_score !== null && sub.compliance_score !== undefined
            ? sub.compliance_score
            : "N/A",
          sub.verdict || "PENDING",
          sub.status,
          sub.current_version,
        ]
          .map(escapeCsvValue)
          .join(",")
      );
    });
    lines.push("");

    // 3. Findings Breakdown (if analytics loaded)
    if (analytics) {
      lines.push("=== AUDIT FINDINGS BY SEVERITY ===");
      lines.push(["Severity Tier", "Count"].map(escapeCsvValue).join(","));
      Object.entries(analytics.findings_by_severity || {}).forEach(([sev, count]) => {
        lines.push([sev, count].map(escapeCsvValue).join(","));
      });
      lines.push("");

      lines.push("=== AUDIT FINDINGS BY CATEGORY ===");
      lines.push(["Category", "Count"].map(escapeCsvValue).join(","));
      Object.entries(analytics.findings_by_category || {}).forEach(([cat, count]) => {
        lines.push([cat, count].map(escapeCsvValue).join(","));
      });
      lines.push("");
    }

    // 4. Ambiguous Guidelines Ledger
    if (ambiguousGuidelines.length > 0) {
      lines.push("=== AMBIGUOUS GUIDELINES & OVERRIDE METRICS ===");
      lines.push(
        [
          "Chunk ID",
          "Source Document",
          "Section Reference",
          "Rule Category",
          "Times Triggered",
          "Times Overridden",
          "Override Rate %",
          "Ambiguity Alert",
          "Rule Excerpt",
        ]
          .map(escapeCsvValue)
          .join(",")
      );

      ambiguousGuidelines.forEach((ag) => {
        lines.push(
          [
            ag.chunk_id,
            ag.source_document,
            ag.section_reference || "N/A",
            ag.rule_category,
            ag.times_triggered,
            ag.times_overridden,
            `${Math.round(ag.override_rate * 100)}%`,
            ag.ambiguity_flag ? "AMBIGUOUS" : "STABLE",
            ag.content_excerpt,
          ]
            .map(escapeCsvValue)
            .join(",")
        );
      });
      lines.push("");
    }

    // 5. Admin Stats Telemetry (if role was authorized)
    if (adminStats) {
      lines.push("=== PLATFORM-WIDE GOVERNANCE TELEMETRY (ADMIN SCOPE) ===");
      lines.push(`AI vs Human Agreement Rate,${escapeCsvValue(`${adminStats.agreement_rate_pct}%`)}`);
      lines.push(`Total Platform Decisions,${escapeCsvValue(adminStats.total_reviews_completed)}`);
      lines.push(`Total Finding Overrides,${escapeCsvValue(adminStats.total_overrides)}`);
      lines.push("");
    }

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute(
      "download",
      `brandlens-report-${brandSlug}-${dateStr}.csv`
    );
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    setExportNotice(`Exported ${filteredSubmissions.length} rows to CSV successfully.`);
    setTimeout(() => setExportNotice(null), 4000);
  }, [
    filteredSubmissions,
    analytics,
    ambiguousGuidelines,
    adminStats,
    activeBrand,
    activeBrandId,
    currentRole,
    dateFilter,
    formatFilter,
    currentAvgScore,
    passRate,
  ]);

  // =====================================================================
  // MISSING BRAND SELECTION VIEW
  // =====================================================================
  if (!activeBrandReady && !isLoading) {
    return (
      <div
        className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${
          isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
        }`}
      >
        <div
          className={`max-w-2xl mx-auto p-8 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#1c1d22] shadow-[8px_8px_0px_#000000]"
              : "border-black bg-white shadow-[8px_8px_0px_#101010]"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-[var(--yellow)] border-2 border-black font-black text-xs uppercase text-black">
              NO ACTIVE BRAND
            </span>
            <span className="text-xs uppercase tracking-wider text-[#888]">
              REPORTS_STUDIO_V1
            </span>
          </div>

          <h1 className="text-2xl font-black uppercase font-['Archivo_Black',sans-serif] tracking-tight mb-3">
            Select a Brand to Generate Reports
          </h1>
          <p className="text-xs text-[#666] dark:text-[#aaa] leading-relaxed mb-6">
            Governance analytics and audit reports require an active brand context. Select one
            of your registered brand workspaces below or create a brand in the Setup Wizard.
          </p>

          {brands.length > 0 ? (
            <div className="space-y-3 mb-6">
              <span className="text-xs font-black uppercase tracking-wider block">
                Available Workspaces ({brands.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBrandId(b.id)}
                    className="p-3 border-2 border-black bg-[var(--paper)] dark:bg-[#25262c] text-left hover:bg-[var(--yellow)] dark:hover:bg-[#ffdb1f] dark:hover:text-black transition-all cursor-pointer shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    <span className="font-black text-xs uppercase block truncate">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-[#777] block mt-0.5">
                      ID: #{b.id} {b.industry ? `• ${b.industry}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 border-2 border-dashed border-black dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/40 text-xs mb-6">
              No brands registered yet in the system. Use the Setup Wizard to onboard your first brand.
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t-2 border-black dark:border-neutral-700">
            <Link
              href="/setup"
              className="px-4 py-2 border-2 border-black bg-[var(--yellow)] text-black font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Launch Setup Wizard
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================================
  // MAIN RENDER
  // =====================================================================
  return (
    <div
      className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${
        isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {/* 1. NOTIFICATION & ERROR BANNERS */}
      {error && (
        <div className="mb-6 p-4 border-3 border-black bg-[var(--red)] text-white shadow-[4px_4px_0px_#000000] flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs uppercase font-black tracking-wider block">
              REPORT TELEMETRY WARNING
            </span>
            <p className="font-mono text-xs mt-0.5 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={loadReportData}
            className="px-3 py-1 border-2 border-black bg-white text-black text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {exportNotice && (
        <div className="mb-6 p-3 border-3 border-black bg-[var(--green)] text-black shadow-[4px_4px_0px_#000000] flex items-center justify-between text-xs font-black uppercase tracking-wider animate-in fade-in">
          <span>{exportNotice}</span>
          <button
            onClick={() => setExportNotice(null)}
            className="underline ml-4 cursor-pointer text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. PAGE HEADER & ACTIVE BRAND CONTEXT */}
      <div
        className={`mb-8 p-6 border-4 ${
          isDark
            ? "border-[#383a45] bg-[#18191f] shadow-[8px_8px_0px_#000000]"
            : "border-black bg-white shadow-[8px_8px_0px_#101010]"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-black dark:border-[#383a45]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-[var(--yellow)] border-2 border-black text-black font-black text-[11px] uppercase tracking-wider">
                GOVERNANCE REPORTING
              </span>
              <span className="px-2.5 py-0.5 bg-[var(--blue)] border-2 border-black text-black font-black text-[11px] uppercase tracking-wider">
                ROLE: {currentRole}
              </span>
              <span className="text-[10px] text-[#666] dark:text-[#999] uppercase">
                TELEMETRY_ENGINE_V1
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase font-['Archivo_Black',sans-serif] tracking-tight text-[var(--ink)] dark:text-white">
              Compliance & Audit Analytics
            </h1>
            <p className="text-xs text-[#555] dark:text-[#aaa] mt-1 max-w-2xl">
              Cross-campaign verification audit ledger, automated rule violation distributions,
              and reviewer ambiguity insights for active brand operations.
            </p>
          </div>

          {/* Quick Actions & Export */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCsv}
              disabled={isLoading}
              className="px-4 py-2 border-3 border-black bg-[var(--green)] text-black font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_#000000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 cursor-pointer transition-transform flex items-center gap-1.5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Report (CSV)
            </button>

            <button
              onClick={() => {
                triggerRefresh();
                loadReportData();
              }}
              disabled={isLoading}
              className="px-3 py-2 border-2 border-black bg-[var(--paper)] dark:bg-[#25262c] text-[var(--ink)] dark:text-white font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer shrink-0"
              title="Refresh report telemetry"
            >
              {isLoading ? "Syncing..." : "Sync"}
            </button>

            <Link
              href="/dashboard"
              className="px-3 py-2 border-2 border-black bg-white dark:bg-[#25262c] text-[var(--ink)] dark:text-white font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Dashboard
            </Link>

            <Link
              href="/audit"
              className="px-3 py-2 border-2 border-black bg-[var(--yellow)] text-black font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              Audit Studio
            </Link>
          </div>
        </div>

        {/* Active Brand Context Bar */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black uppercase tracking-wider text-[#888]">
              ACTIVE WORKSPACE:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 border-2 border-black bg-[var(--yellow)] text-black font-black uppercase text-xs">
                {activeBrand?.name || `Brand #${activeBrandId}`}
              </span>
              {activeBrand?.industry && (
                <span className="px-2 py-0.5 border border-black/40 dark:border-white/20 bg-black/5 dark:bg-white/10 uppercase text-[10px]">
                  {activeBrand.industry}
                </span>
              )}
            </div>

            {/* Quick Brand Switcher if user has multiple brands */}
            {brands.length > 1 && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] text-[#777] uppercase">Switch:</span>
                <select
                  value={activeBrandId}
                  onChange={(e) => setActiveBrandId(Number(e.target.value))}
                  className="px-2 py-0.5 text-xs font-mono font-bold border-2 border-black bg-white dark:bg-[#25262c] dark:text-white cursor-pointer"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (ID: {b.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#777] dark:text-[#999]">
            <span>TOTAL AUDITED: <strong className="text-[var(--ink)] dark:text-white">{totalSubmissionsEver}</strong></span>
            <span>•</span>
            <span>ACTIVE GUIDELINES: <strong className="text-[var(--ink)] dark:text-white">{analytics?.active_guidelines_count ?? "N/A"}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. FILTER & SCOPE CONTROLS (Real Timestamp-based) */}
      <div
        className={`mb-8 p-4 border-3 ${
          isDark
            ? "border-[#383a45] bg-[#18191f] shadow-[4px_4px_0px_#000000]"
            : "border-black bg-white shadow-[4px_4px_0px_#101010]"
        } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
      >
        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider mr-1 text-[#666] dark:text-[#aaa]">
            Time Horizon:
          </span>
          {(["ALL", "7D", "30D", "90D"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateFilter(range)}
              className={`px-3 py-1 border-2 border-black text-xs font-black uppercase transition-all cursor-pointer ${
                dateFilter === range
                  ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#25262c] text-[var(--ink)] dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              {range === "ALL" ? "All Time" : `Last ${range}`}
            </button>
          ))}
        </div>

        {/* Content Format Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider mr-1 text-[#666] dark:text-[#aaa]">
            Format:
          </span>
          {["ALL", "TEXT", "IMAGE", "VIDEO", "AUDIO"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-2.5 py-1 border-2 border-black text-[11px] font-black uppercase transition-all cursor-pointer ${
                formatFilter === fmt
                  ? "bg-[var(--blue)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#25262c] text-[var(--ink)] dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* 4. COMPLIANCE KPI SCORECARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Average Compliance Score */}
        <div
          className={`p-5 border-3 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[5px_5px_0px_#000000]"
              : "border-black bg-white shadow-[5px_5px_0px_#101010]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#666] dark:text-[#aaa]">
              AVG COMPLIANCE
            </span>
            <span
              className={`px-2 py-0.5 border border-black font-black text-[10px] uppercase ${
                currentAvgScore >= 85
                  ? "bg-[var(--green)] text-black"
                  : currentAvgScore >= 70
                  ? "bg-[var(--yellow)] text-black"
                  : "bg-[var(--red)] text-white"
              }`}
            >
              {currentAvgScore >= 85 ? "BENCHMARK MET" : currentAvgScore >= 70 ? "NEEDS WORK" : "HIGH RISK"}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-['Archivo_Black',sans-serif] tracking-tight">
            {isLoading ? "--" : `${currentAvgScore}%`}
          </div>
          <span className="text-[10px] text-[#777] block mt-1">
            Target threshold: 85.0% compliance
          </span>
        </div>

        {/* Card 2: Filtered Submissions Count */}
        <div
          className={`p-5 border-3 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[5px_5px_0px_#000000]"
              : "border-black bg-white shadow-[5px_5px_0px_#101010]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#666] dark:text-[#aaa]">
              SUBMISSIONS AUDITED
            </span>
            <span className="px-2 py-0.5 border border-black bg-[var(--paper)] dark:bg-[#25262c] font-black text-[10px] uppercase">
              {dateFilter}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-['Archivo_Black',sans-serif] tracking-tight">
            {isLoading ? "--" : totalSubmissionsInFilter}
          </div>
          <span className="text-[10px] text-[#777] block mt-1">
            {approvedSubmissions.length} Approved • {flaggedSubmissions.length} Flagged
          </span>
        </div>

        {/* Card 3: Pass Rate % */}
        <div
          className={`p-5 border-3 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[5px_5px_0px_#000000]"
              : "border-black bg-white shadow-[5px_5px_0px_#101010]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#666] dark:text-[#aaa]">
              COMPLIANCE PASS RATE
            </span>
            <span className="px-2 py-0.5 border border-black bg-[var(--yellow)] text-black font-black text-[10px] uppercase">
              APPROVALS
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-['Archivo_Black',sans-serif] tracking-tight">
            {isLoading ? "--" : `${passRate}%`}
          </div>
          <span className="text-[10px] text-[#777] block mt-1">
            {approvedSubmissions.length} of {totalSubmissionsInFilter} passed first review
          </span>
        </div>

        {/* Card 4: Ambiguity & Overrides Alert */}
        <div
          className={`p-5 border-3 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[5px_5px_0px_#000000]"
              : "border-black bg-white shadow-[5px_5px_0px_#101010]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#666] dark:text-[#aaa]">
              AMBIGUOUS RULES
            </span>
            <span
              className={`px-2 py-0.5 border border-black font-black text-[10px] uppercase ${
                flaggedAmbiguities.length > 0
                  ? "bg-[var(--orange)] text-white"
                  : "bg-[var(--green)] text-black"
              }`}
            >
              {flaggedAmbiguities.length > 0 ? "ACTION NEEDED" : "RULES STABLE"}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-['Archivo_Black',sans-serif] tracking-tight">
            {isLoading ? "--" : flaggedAmbiguities.length}
          </div>
          <span className="text-[10px] text-[#777] block mt-1">
            {ambiguousGuidelines.length} total monitored guidelines
          </span>
        </div>
      </div>

      {/* 5. PLATFORM CONSENSUS & TELEMETRY (Only rendered for Reviewer / Judge / Admin / Manager) */}
      {isReviewerOrAdmin && adminStats && (
        <div
          className={`mb-8 p-5 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
          }`}
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black dark:border-[#383a45]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[var(--pink)] border-2 border-black text-black font-black text-[10px] uppercase">
                ADMIN GOVERNANCE TELEMETRY
              </span>
              <h2 className="font-['Archivo_Black',sans-serif] font-black text-sm uppercase tracking-tight text-[var(--ink)] dark:text-white">
                Human Consensus & Override Telemetry
              </h2>
            </div>
            <span className="text-[10px] font-black uppercase text-[#666] dark:text-[#999]">
              SCOPE: {currentRole}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 border-2 border-black bg-white dark:bg-[#25262c]">
              <span className="text-[10px] font-black uppercase text-[#777] block">
                AI vs Reviewer Consensus Rate
              </span>
              <div className="text-2xl font-black font-['Archivo_Black',sans-serif] mt-1 text-[var(--ink)] dark:text-white">
                {adminStats.agreement_rate_pct}%
              </div>
              <span className="text-[10px] text-[#888] block mt-0.5">
                Agreement between AI automated verdict & final human review
              </span>
            </div>

            <div className="p-3 border-2 border-black bg-white dark:bg-[#25262c]">
              <span className="text-[10px] font-black uppercase text-[#777] block">
                Total Reviews Completed
              </span>
              <div className="text-2xl font-black font-['Archivo_Black',sans-serif] mt-1 text-[var(--ink)] dark:text-white">
                {adminStats.total_reviews_completed}
              </div>
              <span className="text-[10px] text-[#888] block mt-0.5">
                Platform-wide reviewed content assets
              </span>
            </div>

            <div className="p-3 border-2 border-black bg-white dark:bg-[#25262c]">
              <span className="text-[10px] font-black uppercase text-[#777] block">
                Total Human Overrides
              </span>
              <div className="text-2xl font-black font-['Archivo_Black',sans-serif] mt-1 text-[var(--ink)] dark:text-white">
                {adminStats.total_overrides}
              </div>
              <span className="text-[10px] text-[#888] block mt-0.5">
                Individual AI findings manually overridden by reviewers
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. CHARTS & FINDINGS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Compliance Trend Chart */}
        <div
          className={`lg:col-span-8 p-6 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-white shadow-[6px_6px_0px_#101010]"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-black dark:border-[#383a45]">
            <div>
              <h2 className="font-['Archivo_Black',sans-serif] font-black text-base uppercase tracking-tight text-[var(--ink)] dark:text-white">
                Compliance Score Trajectory
              </h2>
              <span className="text-[11px] text-[#666] dark:text-[#999]">
                Chronological score evaluation across audited runs ({dateFilter})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-[var(--yellow)] border border-black" />
              <span className="text-[11px] font-black uppercase">Score</span>
              <span className="inline-block w-3 h-0.5 bg-[var(--green)] ml-2" />
              <span className="text-[11px] font-black uppercase">85% Target</span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {isMounted && trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? "#ffdb1f" : "#ffdb1f"} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={isDark ? "#ffdb1f" : "#ffdb1f"} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#383a45" : "#e2e8f0"} />
                  <XAxis
                    dataKey="runLabel"
                    stroke={isDark ? "#9ca3af" : "#111827"}
                    fontSize={11}
                    fontFamily="monospace"
                  />
                  <YAxis
                    domain={[40, 100]}
                    stroke={isDark ? "#9ca3af" : "#111827"}
                    fontSize={11}
                    fontFamily="monospace"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[4px_4px_0px_#000] text-xs font-mono">
                            <span className="font-black block uppercase">{data.title}</span>
                            <span className="text-[10px] text-[#777] block mt-0.5">
                              {data.runLabel} • {data.format}
                            </span>
                            <div className="mt-2 flex items-center justify-between gap-4">
                              <span>Compliance Score:</span>
                              <strong className="text-sm font-black">{data.score}%</strong>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[10px] text-[#666] dark:text-[#aaa]">
                              <span>Verdict:</span>
                              <strong className="uppercase">{data.verdict}</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: "TARGET (85%)",
                      fill: "#10b981",
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: "bold",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#000000"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-black/30 dark:border-white/20">
                <span className="text-xs font-black uppercase text-[#777]">
                  {isLoading ? "Loading trend telemetry..." : "No submission runs found in selected time range"}
                </span>
                <span className="text-[10px] text-[#999] mt-1">
                  Audit new content in Creator Studio or adjust your filters above.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Severity & Category Breakdown */}
        <div
          className={`lg:col-span-4 p-6 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-white shadow-[6px_6px_0px_#101010]"
          }`}
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black dark:border-[#383a45]">
            <h2 className="font-['Archivo_Black',sans-serif] font-black text-sm uppercase tracking-tight text-[var(--ink)] dark:text-white">
              Findings Breakdown
            </h2>
            <span className="text-[11px] font-black uppercase text-[#666] dark:text-[#999]">
              {totalFindings} Total
            </span>
          </div>

          {/* Severity Bars */}
          <div className="mb-6 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#888] block">
              BY SEVERITY TIER:
            </span>

            {/* Critical */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-black uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[var(--red)] border border-black inline-block" />
                  Critical
                </span>
                <span className="font-black">{severityCounts["CRITICAL"] || 0}</span>
              </div>
              <div className="w-full h-3 border-2 border-black bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-[var(--red)]"
                  style={{
                    width: `${
                      totalFindings > 0
                        ? Math.min(100, Math.round(((severityCounts["CRITICAL"] || 0) / totalFindings) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Warning */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-black uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[var(--orange)] border border-black inline-block" />
                  Warning
                </span>
                <span className="font-black">{severityCounts["WARNING"] || 0}</span>
              </div>
              <div className="w-full h-3 border-2 border-black bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-[var(--orange)]"
                  style={{
                    width: `${
                      totalFindings > 0
                        ? Math.min(100, Math.round(((severityCounts["WARNING"] || 0) / totalFindings) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-black uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[var(--blue)] border border-black inline-block" />
                  Info
                </span>
                <span className="font-black">{severityCounts["INFO"] || 0}</span>
              </div>
              <div className="w-full h-3 border-2 border-black bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-[var(--blue)]"
                  style={{
                    width: `${
                      totalFindings > 0
                        ? Math.min(100, Math.round(((severityCounts["INFO"] || 0) / totalFindings) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category Badges */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#888] block mb-2">
              BY AUDIT CATEGORY:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(categoryCounts).length > 0 ? (
                Object.entries(categoryCounts).map(([cat, count]) => (
                  <div
                    key={cat}
                    className="p-2 border-2 border-black bg-[var(--paper)] dark:bg-[#25262c] flex items-center justify-between"
                  >
                    <span className="font-black uppercase text-[10px] truncate">{cat}</span>
                    <span className="font-black text-xs px-1.5 py-0.2 bg-white dark:bg-black border border-black ml-1">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-[10px] text-[#777] py-2 border border-dashed border-black/40">
                  No category violations recorded
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 7. AMBIGUOUS GUIDELINE & REVIEWER OVERRIDES INTELLIGENCE */}
      <div
        className={`mb-8 p-6 border-4 ${
          isDark
            ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
            : "border-black bg-white shadow-[6px_6px_0px_#101010]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b-2 border-black dark:border-[#383a45]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-[var(--orange)] border-2 border-black text-white font-black text-[10px] uppercase">
                GOVERNANCE INTELLIGENCE
              </span>
              <h2 className="font-['Archivo_Black',sans-serif] font-black text-base uppercase tracking-tight text-[var(--ink)] dark:text-white">
                Ambiguous Guidelines & Human Override Analysis
              </h2>
            </div>
            <p className="text-xs text-[#666] dark:text-[#aaa]">
              Rules frequently overridden by human reviewers indicate ambiguous phrasing,
              strict false positives, or outdated brand policy requiring clarification.
            </p>
          </div>

          <span className="text-xs font-black uppercase text-[#777] shrink-0">
            {ambiguousGuidelines.length} Monitored Rules
          </span>
        </div>

        {ambiguousGuidelines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-3 border-black dark:border-[#383a45] bg-[var(--paper)] dark:bg-[#25262c]">
                  <th className="p-2.5 font-black uppercase">Section / Document</th>
                  <th className="p-2.5 font-black uppercase">Category</th>
                  <th className="p-2.5 font-black uppercase">Rule Excerpt</th>
                  <th className="p-2.5 font-black uppercase text-center">Triggered</th>
                  <th className="p-2.5 font-black uppercase text-center">Overridden</th>
                  <th className="p-2.5 font-black uppercase text-center">Override %</th>
                  <th className="p-2.5 font-black uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/20 dark:divide-white/10">
                {ambiguousGuidelines.map((ag) => (
                  <tr
                    key={ag.chunk_id}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-2.5 font-black">
                      <span className="block truncate max-w-[180px]">
                        {ag.section_reference || "General Section"}
                      </span>
                      <span className="text-[10px] text-[#777] block truncate max-w-[180px]">
                        {ag.source_document}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 border border-black bg-white dark:bg-black font-black text-[10px] uppercase">
                        {ag.rule_category}
                      </span>
                    </td>
                    <td className="p-2.5 max-w-xs text-[11px] text-[#444] dark:text-[#ccc]">
                      <p className="line-clamp-2 leading-relaxed">{ag.content_excerpt}</p>
                    </td>
                    <td className="p-2.5 text-center font-bold">{ag.times_triggered}</td>
                    <td className="p-2.5 text-center font-bold">{ag.times_overridden}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`font-black ${
                          ag.override_rate >= 0.5 ? "text-[var(--red)]" : "text-[#555] dark:text-[#aaa]"
                        }`}
                      >
                        {Math.round(ag.override_rate * 100)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      {ag.ambiguity_flag ? (
                        <span className="px-2 py-1 border-2 border-black bg-[var(--yellow)] text-black font-black text-[10px] uppercase shadow-[2px_2px_0px_#000] inline-block">
                          AMBIGUOUS (≥50%)
                        </span>
                      ) : (
                        <span className="px-2 py-1 border border-black bg-[var(--green)] text-black font-black text-[10px] uppercase inline-block">
                          STABLE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center border-2 border-dashed border-black/30 dark:border-white/20">
            <span className="text-xs font-black uppercase text-[#777]">
              No ambiguous guideline overrides detected yet for this brand.
            </span>
            <p className="text-[11px] text-[#999] mt-1">
              As reviewers audit and override findings in the Studio, patterns will be surfaced automatically.
            </p>
          </div>
        )}
      </div>

      {/* 8. AUDITED SUBMISSIONS DETAIL LEDGER */}
      <div
        className={`p-6 border-4 ${
          isDark
            ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
            : "border-black bg-white shadow-[6px_6px_0px_#101010]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b-2 border-black dark:border-[#383a45]">
          <div>
            <h2 className="font-['Archivo_Black',sans-serif] font-black text-base uppercase tracking-tight text-[var(--ink)] dark:text-white">
              Audited Submissions Detail Ledger
            </h2>
            <span className="text-xs text-[#666] dark:text-[#aaa]">
              Showing {filteredSubmissions.length} of {submissions.length} total entries
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-[#777]">
              Scope: {dateFilter} • {formatFilter}
            </span>
          </div>
        </div>

        {filteredSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-3 border-black dark:border-[#383a45] bg-[var(--paper)] dark:bg-[#25262c]">
                  <th className="p-2.5 font-black uppercase">ID / Date</th>
                  <th className="p-2.5 font-black uppercase">Submission Title</th>
                  <th className="p-2.5 font-black uppercase">Creator</th>
                  <th className="p-2.5 font-black uppercase">Format</th>
                  <th className="p-2.5 font-black uppercase text-center">Score</th>
                  <th className="p-2.5 font-black uppercase text-center">Verdict</th>
                  <th className="p-2.5 font-black uppercase text-center">Status</th>
                  <th className="p-2.5 font-black uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/20 dark:divide-white/10">
                {filteredSubmissions.map((sub) => {
                  const d = sub.created_at ? new Date(sub.created_at) : null;
                  const dateStr =
                    d && !isNaN(d.getTime())
                      ? d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A";

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="p-2.5 font-bold">
                        <span className="block">#{sub.id}</span>
                        <span className="text-[10px] text-[#777] block font-normal">{dateStr}</span>
                      </td>

                      <td className="p-2.5">
                        <span className="font-black block truncate max-w-xs">{sub.title}</span>
                        <span className="text-[10px] text-[#777] block uppercase">
                          v{sub.current_version} • {sub.platform || "GENERAL"}
                        </span>
                      </td>

                      <td className="p-2.5 font-bold truncate max-w-[120px]">
                        {sub.creator_name}
                      </td>

                      <td className="p-2.5">
                        <span className="px-2 py-0.5 border border-black bg-white dark:bg-black font-black text-[10px] uppercase">
                          {sub.content_format}
                        </span>
                      </td>

                      <td className="p-2.5 text-center">
                        <span
                          className={`font-black text-xs px-2 py-0.5 border border-black inline-block ${
                            (sub.compliance_score ?? 100) >= 85
                              ? "bg-[var(--green)] text-black"
                              : (sub.compliance_score ?? 100) >= 70
                              ? "bg-[var(--yellow)] text-black"
                              : "bg-[var(--red)] text-white"
                          }`}
                        >
                          {sub.compliance_score !== null && sub.compliance_score !== undefined
                            ? `${sub.compliance_score}%`
                            : "N/A"}
                        </span>
                      </td>

                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 border border-black font-black text-[10px] uppercase inline-block ${
                            sub.verdict === "PASS"
                              ? "bg-[var(--green)] text-black"
                              : sub.verdict === "FAIL"
                              ? "bg-[var(--red)] text-white"
                              : "bg-[var(--yellow)] text-black"
                          }`}
                        >
                          {sub.verdict || "PENDING"}
                        </span>
                      </td>

                      <td className="p-2.5 text-center">
                        <span className="text-[10px] font-mono font-bold uppercase block">
                          {sub.status}
                        </span>
                      </td>

                      <td className="p-2.5 text-right">
                        <Link
                          href={`/audit?id=${sub.id}`}
                          className="px-2.5 py-1 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white font-black text-[10px] uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 inline-block"
                        >
                          Audit Studio &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center border-2 border-dashed border-black/30 dark:border-white/20">
            <span className="text-xs font-black uppercase text-[#777]">
              No submissions match the selected date or format filters.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
