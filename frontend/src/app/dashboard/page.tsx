"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { GovernanceAnalytics, Submission, SubmissionStatus, UserRole } from "@/lib/types";
import TechText from "@/components/ui/TechText";
import DriftWall from "@/components/ui/DriftWall";

export default function GovernanceDashboardPage() {
  const { activeBrandId, currentRole, brands, theme, refreshKey, setActiveBrandId, refreshBrands } = useApp();
  const isDark = theme === "dark";
  const activeBrandReady = activeBrandId > 0 && brands.some((brand) => brand.id === activeBrandId);

  const isCreator = currentRole === "CREATOR";
  const isBrand = currentRole === "REVIEWER" || currentRole === "MANAGER";
  const isAdmin = currentRole === "ADMIN" || currentRole === "JUDGE";

  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<"compliance" | "violations">("compliance");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Future Clients & Enterprise Prospects Pipeline
  const futureClients = [
    {
      name: "Zepto",
      industry: "Quick Commerce Retail",
      category: "10-Minute Dark Store Grocery",
      pipelineStatus: "Ready for Ingestion",
      fitScore: "98% Fit",
      tone: "Energetic, fast, friendly, culturally connected, reliable",
      palette: ["#9333EA", "#EC4899", "#111827", "#FFFFFF"],
      bannedTerms: ["guaranteed delivery in 5 mins", "zero cost forever"],
      leadSource: "Enterprise Pitch",
      description: "Direct competitor to Blinkit in Indian Q-commerce with instant dark store fulfillment model.",
    },
    {
      name: "Swiggy Instamart",
      industry: "Hyperlocal Quick Commerce",
      category: "On-Demand Grocery & Essentials",
      pipelineStatus: "Evaluation Pilot",
      fitScore: "94% Fit",
      tone: "Friendly, punctual, vibrant, household-trusted",
      palette: ["#FC8019", "#282C3F", "#FFFFFF"],
      bannedTerms: ["100% free grocery", "instant delivery unconditionally"],
      leadSource: "Product Trial",
      description: "India's premier food & grocery aggregator with strict festive campaign governance.",
    },
    {
      name: "Zomato",
      industry: "Food Tech & Dining",
      category: "Restaurant Aggregation & Nightlife",
      pipelineStatus: "Contract Review",
      fitScore: "90% Fit",
      tone: "Witty, humorous, pop-culture driven, food-obsessed",
      palette: ["#CB202D", "#2D2D2D", "#FFFFFF"],
      bannedTerms: ["unlimited free food", "no questions asked refund always"],
      leadSource: "Partner Referral",
      description: "High-volume social copy and outdoor billboard advertising with viral copy requirements.",
    },
    {
      name: "Nykaa",
      industry: "Beauty & Personal Care",
      category: "Cosmetics, Skincare & Wellness",
      pipelineStatus: "Evaluation Trial",
      fitScore: "87% Fit",
      tone: "Sophisticated, authentic, empowering, wellness-first",
      palette: ["#FC2779", "#27272A", "#FFFFFF"],
      bannedTerms: ["miracle cure in 24 hours", "permanent skin whitening"],
      leadSource: "Enterprise Inbound",
      description: "Stringent regulatory compliance for dermatological claims and cosmetic safety claims.",
    },
    {
      name: "Nike India",
      industry: "Sportswear & Athleisure",
      category: "Athletic Footwear & Performance Apparel",
      pipelineStatus: "Enterprise Prospect",
      fitScore: "84% Fit",
      tone: "Inspirational, relentless, premium, athlete-focused",
      palette: ["#000000", "#FFFFFF", "#E11D48"],
      bannedTerms: ["cheapest shoes", "knockoff discounts"],
      leadSource: "Marketing Division",
      description: "Global trademark standards, athlete quote attribution, and visual contrast governance.",
    },
  ];

  const handleProvisionProspect = async (prospect: (typeof futureClients)[0]) => {
    setProvisioningName(prospect.name);
    try {
      let existing = brands.find((b) => b.name.toLowerCase() === prospect.name.toLowerCase());
      if (!existing) {
        existing = await api.createBrand({
          name: prospect.name,
          industry: prospect.industry,
          tone_persona: prospect.tone,
          approved_hex_palette: prospect.palette,
          banned_terms: prospect.bannedTerms,
          preferred_terminology: {},
          min_wcag_contrast: 4.5,
        });
        await refreshBrands();
      }
      setActiveBrandId(existing.id);
      setAdminTab("clients");
    } catch (err) {
      console.error("Failed to provision prospect brand:", err);
    } finally {
      setProvisioningName(null);
    }
  };

  // Tabs for Creator & Brand views
  const [creatorTab, setCreatorTab] = useState<"ALL" | "REJECTED" | "APPROVED" | "REVIEW">("ALL");
  const [brandTab, setBrandTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [adminTab, setAdminTab] = useState<"clients" | "submissions" | "pipeline">("clients");
  const [provisioningName, setProvisioningName] = useState<string | null>(null);

  // Rejection modal for Brand Reviewer
  const [rejectingSub, setRejectingSub] = useState<Submission | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Quick status update (Approve / Reject)
  const handleQuickStatusUpdate = async (subId: number, targetStatus: SubmissionStatus, customNotes?: string) => {
    setUpdatingId(subId);
    setError(null);
    try {
      const notes =
        customNotes ||
        (targetStatus === "CHANGES_REQUESTED" || targetStatus === "REJECTED"
          ? "Administrative review: Revision requested by governance lead."
          : undefined);
      await api.updateStatus(subId, targetStatus, notes, { userRole: currentRole });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, status: targetStatus } : s))
      );
      if (activeBrandReady) {
        const analyticsData = await api.getAnalytics(activeBrandId, { userRole: currentRole });
        setAnalytics(analyticsData);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Cannot update status to ${targetStatus}: ${msg}`);
      setTimeout(() => setError(null), 8000);
    } finally {
      setUpdatingId(null);
      setRejectingSub(null);
      setRejectionNotes("");
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectingSub) return;
    setIsSubmittingReject(true);
    await handleQuickStatusUpdate(
      rejectingSub.id,
      "CHANGES_REQUESTED",
      rejectionNotes.trim() || "Brand Reviewer requested revisions to align with brand guidelines."
    );
    setIsSubmittingReject(false);
  };

  const loadDashboardData = useCallback(async () => {
    if (!activeBrandReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsData, submissionsData] = await Promise.all([
        api.getAnalytics(activeBrandId, { userRole: currentRole }).catch(() => null),
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
  }, [activeBrandId, activeBrandReady, currentRole]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      if (!activeBrandReady) {
        setError(null);
        setIsLoading(brands.length === 0);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [analyticsData, submissionsData] = await Promise.all([
          api.getAnalytics(activeBrandId, { userRole: currentRole }).catch(() => null),
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
  }, [activeBrandId, activeBrandReady, brands.length, currentRole, refreshKey]);

  // Derived metrics
  const totalSubmissions = analytics?.total_submissions ?? submissions.length;
  const avgComplianceScore = analytics?.avg_compliance_score ?? 0;
  const openFindingsCount = analytics?.resolution_breakdown?.["OPEN"] ?? 0;
  const totalFindings = analytics?.total_findings_generated ?? 0;

  const rejectedSubmissions = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === "CHANGES_REQUESTED" ||
          s.status === "REJECTED" ||
          s.verdict === "FAIL"
      ),
    [submissions]
  );

  const approvedSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "APPROVED"),
    [submissions]
  );

  const pendingReviewSubmissions = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === "NEEDS_REVIEW" ||
          s.status === "DRAFT" ||
          s.status === "AUDITING"
      ),
    [submissions]
  );

  // Filtered submissions based on active tab
  const filteredCreatorSubmissions = useMemo(() => {
    if (creatorTab === "REJECTED") return rejectedSubmissions;
    if (creatorTab === "APPROVED") return approvedSubmissions;
    if (creatorTab === "REVIEW") return pendingReviewSubmissions;
    return submissions;
  }, [creatorTab, submissions, rejectedSubmissions, approvedSubmissions, pendingReviewSubmissions]);

  const filteredBrandSubmissions = useMemo(() => {
    if (brandTab === "PENDING") return pendingReviewSubmissions;
    if (brandTab === "APPROVED") return approvedSubmissions;
    if (brandTab === "REJECTED") return rejectedSubmissions;
    return submissions;
  }, [brandTab, submissions, pendingReviewSubmissions, approvedSubmissions, rejectedSubmissions]);

  // Top violation categories
  const categoryBreakdown = analytics?.findings_by_category || {};
  const categoryEntries = Object.entries(categoryBreakdown);
  const totalCategoryViolations = categoryEntries.reduce((acc, [, val]) => acc + val, 0) || 1;

  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const chartData = useMemo(() => {
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

  const topSubmissions = useMemo(() => {
    if (!submissions || submissions.length === 0) return [];
    return [...submissions]
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA || b.id - a.id;
      })
      .slice(0, 10);
  }, [submissions]);

  return (
    <div
      className={`relative w-full px-4 sm:px-6 lg:px-8 py-6 font-sans transition-colors duration-200 ${
        isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#111827]"
      }`}
    >
      {/* Error Banner */}
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
            className="px-3 py-1 rounded-md bg-[#dc2626] text-white text-xs font-semibold hover:bg-[#b91c1c] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CONTENT CREATOR VIEW                                                   */}
      {/* ========================================================================= */}
      {isCreator && (
        <div className="space-y-6">
          {/* Creator Hero Header */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
              isDark
                ? "bg-gradient-to-br from-[#1b1b1f] via-[#1a1b22] to-[#14151a] border-[#383a45]"
                : "bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/40 border-[#cbd5e1]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Creator Studio · Blinkit Demo Partner
                  </span>
                  <span className="text-xs font-medium text-text-muted">Diwali 2026 Campaign</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                  Your Creative Submissions & Compliance Feedback
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
                  Track your uploaded copy briefs, festive banners, and video reels. Inspect automated AI pre-flight checks, review judge feedback, and fix flagged policy issues.
                </p>
              </div>
              <Link
                href="/content"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                + Upload New Creative
              </Link>
            </div>
          </div>

          {/* Creator KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#383a45]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-medium">
                <span>Total Uploads</span>
                <span className="material-symbols-outlined text-text-muted text-[18px]">folder_copy</span>
              </div>
              <div className="text-2xl font-bold font-mono text-on-surface">{submissions.length}</div>
              <p className="text-[11px] text-text-muted mt-1">Collateral submitted</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#383a45]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-medium">
                <span>Approved by Judge</span>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {approvedSubmissions.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Ready for publication</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                rejectedSubmissions.length > 0
                  ? isDark
                    ? "bg-red-950/20 border-red-800/40"
                    : "bg-red-50/70 border-red-200"
                  : isDark
                  ? "bg-[#1b1b1f] border-[#383a45]"
                  : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 mb-1 font-medium">
                <span>Action Required / Rejected</span>
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                {rejectedSubmissions.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">See reasons below to fix</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#383a45]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">
                <span>Under Review</span>
                <span className="material-symbols-outlined text-[18px]">pending</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {pendingReviewSubmissions.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Awaiting judge evaluation</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCreatorTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                creatorTab === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-on-surface hover:bg-palette-7/30"
              }`}
            >
              All Submissions ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setCreatorTab("REJECTED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                creatorTab === "REJECTED"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Rejected by Judge ({rejectedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setCreatorTab("APPROVED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                creatorTab === "APPROVED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Approved ({approvedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setCreatorTab("REVIEW")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                creatorTab === "REVIEW"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
              In Review ({pendingReviewSubmissions.length})
            </button>
          </div>

          {/* Submissions Cards List with Rejection Feedback */}
          {filteredCreatorSubmissions.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl">
              <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">folder_open</span>
              <p className="text-base font-bold text-on-surface">No submissions found in this view</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                {creatorTab === "REJECTED"
                  ? "Awesome! None of your submissions are currently marked as rejected."
                  : "Start by submitting your first creative asset for the Blinkit Diwali campaign."}
              </p>
              <Link
                href="/content"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                + Upload Creative Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCreatorSubmissions.map((sub) => {
                const isRejected =
                  sub.status === "CHANGES_REQUESTED" ||
                  sub.status === "REJECTED" ||
                  sub.verdict === "FAIL";
                const isApproved = sub.status === "APPROVED";
                const criticalCount =
                  sub.findings?.filter((f) => f.severity === "CRITICAL").length || 0;
                const warningCount =
                  sub.findings?.filter((f) => f.severity === "WARNING").length || 0;

                return (
                  <div
                    key={sub.id}
                    className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                      isRejected
                        ? isDark
                          ? "bg-[#1f1b20] border-red-800/50 shadow-sm"
                          : "bg-red-50/30 border-red-200 shadow-sm"
                        : isApproved
                        ? isDark
                          ? "bg-[#18201a] border-emerald-800/40"
                          : "bg-emerald-50/30 border-emerald-200"
                        : isDark
                        ? "bg-[#1b1b1f] border-[#383a45]"
                        : "bg-white border-[#cbd5e1]"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            sub.content_format === "IMAGE"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : sub.content_format === "VIDEO"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : sub.content_format === "AUDIO"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {sub.content_format === "IMAGE"
                              ? "image"
                              : sub.content_format === "VIDEO"
                              ? "movie"
                              : sub.content_format === "AUDIO"
                              ? "volume_up"
                              : "description"}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-on-surface flex items-center gap-2">
                            {sub.title}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                            <span className="font-mono">SUB-#{sub.id}</span>
                            <span>•</span>
                            <span className="font-semibold uppercase tracking-wider">
                              {sub.content_format}
                            </span>
                            <span>•</span>
                            <span>v{sub.current_version}</span>
                            <span>•</span>
                            <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge & Score */}
                      <div className="flex items-center gap-3">
                        {sub.compliance_score != null && (
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-text-muted uppercase block">Score</span>
                            <span
                              className={`font-mono text-sm font-bold ${
                                sub.compliance_score >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : sub.compliance_score >= 60
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {sub.compliance_score}%
                            </span>
                          </div>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold font-sans flex items-center gap-1.5 ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300"
                              : isRejected
                              ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300 border border-red-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isApproved ? "bg-emerald-500" : isRejected ? "bg-red-500" : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          {isApproved
                            ? "Approved"
                            : isRejected
                            ? "Rejected by Judge / Needs Changes"
                            : "Under Review"}
                        </span>
                      </div>
                    </div>

                    {/* REJECTION REASON & JUDGE FEEDBACK BOX */}
                    {isRejected && (
                      <div className="mt-4 p-4 rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/30 text-left space-y-3">
                        <div className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[20px] shrink-0 mt-0.5">
                            gavel
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs font-sans text-red-900 dark:text-red-200 uppercase tracking-wider">
                              Why the Judge / Reviewer Rejected This Submission:
                            </h4>
                            <p className="text-xs text-red-800 dark:text-red-300 mt-1 leading-relaxed">
                              This asset failed Blinkit Diwali brand governance rules. Review the specific policy violations below and update the draft before re-submitting.
                            </p>
                          </div>
                        </div>

                        {/* Findings list explaining exact reason */}
                        {sub.findings && sub.findings.length > 0 && (
                          <div className="space-y-2 pt-1 border-t border-red-200 dark:border-red-900/50">
                            {sub.findings.slice(0, 3).map((f) => (
                              <div
                                key={f.id}
                                className="p-2.5 rounded-lg bg-white/80 dark:bg-[#121316]/60 border border-red-200 dark:border-red-900/40 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                        f.severity === "CRITICAL"
                                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                      }`}
                                    >
                                      {f.severity}
                                    </span>
                                    <span className="font-semibold text-on-surface">
                                      {f.category.replace("_", " ")} Policy
                                    </span>
                                  </div>
                                </div>
                                {f.flagged_excerpt && (
                                  <p className="font-mono text-[11px] text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-950/40 px-2 py-0.5 rounded">
                                    "{f.flagged_excerpt}"
                                  </p>
                                )}
                                <p className="text-text-muted text-[11px] leading-relaxed">
                                  <span className="font-semibold text-on-surface">Reason: </span>
                                  {f.explanation}
                                </p>
                                {f.suggested_correction && (
                                  <p className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed">
                                    <span className="font-semibold">How to fix: </span>
                                    {f.suggested_correction}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action CTA */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                            {criticalCount} Critical, {warningCount} Warning issues detected
                          </span>
                          <Link
                            href={`/audit?id=${sub.id}&event=diwali`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            <span>Fix & Re-Audit in Workspace</span>
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* APPROVED NOTICE */}
                    {isApproved && (
                      <div className="mt-4 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                          <span>Passed brand compliance checks. Cleared for publication across Blinkit marketing channels.</span>
                        </div>
                        <Link
                          href={`/audit?id=${sub.id}`}
                          className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                        >
                          View Certificate →
                        </Link>
                      </div>
                    )}

                    {/* IN REVIEW NOTICE */}
                    {!isApproved && !isRejected && (
                      <div className="mt-4 p-3 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                          <span className="material-symbols-outlined text-amber-600 text-[18px]">hourglass_top</span>
                          <span>AI pre-flight check completed. Currently in queue for Blinkit Brand Reviewer sign-off.</span>
                        </div>
                        <Link
                          href={`/audit?id=${sub.id}`}
                          className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
                        >
                          Inspect Pre-Flight →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BRAND REVIEWER VIEW                                                    */}
      {/* ========================================================================= */}
      {isBrand && (
        <div className="space-y-6">
          {/* Brand Hero Header */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
              isDark
                ? "bg-gradient-to-br from-[#1b1b1f] via-[#1a1b22] to-[#14151a] border-[#383a45]"
                : "bg-gradient-to-br from-blue-50/70 via-white to-amber-50/40 border-[#cbd5e1]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    Brand Governance Panel
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {brands.find((b) => b.id === activeBrandId)?.name || "Blinkit"} Active
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                  Content Uploaded by Creators
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
                  Review, approve, or request revisions on multi-modal copy, posters, and reels uploaded by agency creators before they go live on public channels.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/guidelines"
                  className="px-4 py-2.5 rounded-xl border border-border hover:border-primary text-xs font-bold font-sans transition-colors"
                >
                  Brand Guidelines
                </Link>
                <Link
                  href="/audit"
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-[#004578] text-white text-xs font-bold font-sans transition-colors shadow-xs"
                >
                  Full Audit Queue
                </Link>
              </div>
            </div>
          </div>

          {/* Brand KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-medium">
                <span>Avg Compliance Score</span>
                <span className="material-symbols-outlined text-text-muted text-[18px]">verified</span>
              </div>
              <div className="text-2xl font-bold font-mono text-primary">
                {Math.round(avgComplianceScore) || 92}%
              </div>
              <p className="text-[11px] text-text-muted mt-1">Across all audited assets</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">
                <span>Awaiting Review</span>
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {pendingReviewSubmissions.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Needs reviewer action</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-medium">
                <span>Approved Content</span>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {approvedSubmissions.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Authorized for publication</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 mb-1 font-medium">
                <span>Changes Requested</span>
                <span className="material-symbols-outlined text-[18px]">replay</span>
              </div>
              <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                {rejectedSubmissions.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Revisions sent to creator</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setBrandTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                brandTab === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-on-surface hover:bg-palette-7/30"
              }`}
            >
              All Creator Submissions ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setBrandTab("PENDING")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                brandTab === "PENDING"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              Awaiting Review ({pendingReviewSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setBrandTab("APPROVED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                brandTab === "APPROVED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Approved ({approvedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setBrandTab("REJECTED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                brandTab === "REJECTED"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              Changes Requested ({rejectedSubmissions.length})
            </button>
          </div>

          {/* Submissions Table for Brand Reviewer */}
          <div
            className={`rounded-2xl border overflow-hidden shadow-xs ${
              isDark ? "bg-[#1b1b1f] border-[#383a45]" : "bg-white border-[#cbd5e1]"
            }`}
          >
            <div className="overflow-x-auto">
              {filteredBrandSubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-[36px] text-text-muted mb-1">inbox</span>
                  <p className="text-sm font-bold text-on-surface">No creator submissions in this queue</p>
                  <p className="text-xs text-text-muted mt-0.5">Submissions will show up here as creators upload content.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr
                      className={`text-[10px] font-mono uppercase tracking-wider font-semibold border-b ${
                        isDark ? "bg-[#14151a] text-text-muted border-[#2e2f38]" : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <th className="py-3 px-4">Asset / Title</th>
                      <th className="py-3 px-4">Creator / Format</th>
                      <th className="py-3 px-4">Audit Score</th>
                      <th className="py-3 px-4">Findings</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-border">
                    {filteredBrandSubmissions.map((sub) => {
                      const criticalFindings =
                        sub.findings?.filter((f) => f.severity === "CRITICAL").length || 0;
                      const warningFindings =
                        sub.findings?.filter((f) => f.severity === "WARNING").length || 0;

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-palette-7/20 transition-colors ${
                            updatingId === sub.id ? "opacity-50" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface text-sm">{sub.title}</div>
                            <div className="text-[11px] font-mono text-text-muted">
                              SUB-#{sub.id} · v{sub.current_version} · {new Date(sub.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-on-surface">{sub.creator_name || "Agency Creator"}</div>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-palette-7/40 text-text-muted">
                              {sub.content_format}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold">
                            {sub.compliance_score != null ? (
                              <span
                                className={
                                  sub.compliance_score >= 80
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : sub.compliance_score >= 60
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                                }
                              >
                                {sub.compliance_score}%
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {criticalFindings > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] font-mono font-bold">
                                  {criticalFindings} Crit
                                </span>
                              )}
                              {warningFindings > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-mono font-bold">
                                  {warningFindings} Warn
                                </span>
                              )}
                              {criticalFindings === 0 && warningFindings === 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                                  ✓ Clean
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                sub.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                  : sub.status === "CHANGES_REQUESTED" || sub.status === "REJECTED"
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              }`}
                            >
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {sub.status !== "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusUpdate(sub.id, "APPROVED")}
                                  disabled={updatingId === sub.id}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-2xs"
                                  title="Approve for publication"
                                >
                                  ✓ Approve
                                </button>
                              )}

                              {sub.status !== "CHANGES_REQUESTED" && (
                                <button
                                  type="button"
                                  onClick={() => setRejectingSub(sub)}
                                  disabled={updatingId === sub.id}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-2xs"
                                  title="Reject with notes"
                                >
                                  ✕ Reject
                                </button>
                              )}

                              <Link
                                href={`/audit?id=${sub.id}`}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border hover:border-primary text-on-surface hover:text-primary transition-colors"
                              >
                                Audit Workspace
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Rejection Modal for Brand Reviewer */}
          {rejectingSub && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div
                className={`relative w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${
                  isDark ? "bg-[#18191d] border-[#383a45] text-white" : "bg-white border-[#cbd5e1] text-[#111827]"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined">feedback</span>
                    <h3 className="font-bold text-base">Request Changes on Submission</h3>
                  </div>
                  <button
                    onClick={() => setRejectingSub(null)}
                    className="p-1 rounded-full text-text-muted hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-text-muted">Target Asset:</span>
                    <p className="font-bold text-sm text-on-surface">{rejectingSub.title}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Reason for Rejection / Revision Instructions:
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="e.g. Please replace fireworks imagery with diya lamps to comply with Blinkit Green Diwali guideline, and remove the unverified claim."
                      className="w-full p-3 rounded-xl border border-border bg-palette-7/20 text-xs text-on-surface focus:outline-none focus:border-red-500"
                    />
                    <p className="text-[11px] text-text-muted mt-1">
                      The creator will immediately see this note in their Creator Dashboard under "Why Judge Rejected This Submission".
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setRejectingSub(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-on-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRejection}
                      disabled={isSubmittingReject}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReject ? "Submitting..." : "Send Rejection Feedback"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ADMIN / JUDGE VIEW (FULL ENTERPRISE CONSOLE)                            */}
      {/* ========================================================================= */}
      {isAdmin && (
        <>
          {/* Hero Banner with DriftWall and TechText */}
          <section className="mb-6 relative w-full h-[290px] sm:h-[330px] lg:h-[360px] overflow-hidden rounded-3xl select-none">
            <div className="absolute top-0 bottom-0 right-0 w-[62%] sm:w-[68%] lg:w-[72%] z-0 overflow-hidden pointer-events-auto">
              <DriftWall
                columns={4}
                tileWidth={190}
                tileHeight={125}
                gap={16}
                tilt={28}
                turn={-14}
                perspective={1100}
                depth={110}
                speed={35}
                direction="up"
                variance={0.45}
                parallax={0.6}
                lift={55}
                fade={0.65}
                dim={isDark ? 0.45 : 0.65}
                overlayColor={isDark ? "#121316" : "#f8fafc"}
              />
              <div
                className={`absolute inset-y-0 left-0 w-32 pointer-events-none bg-gradient-to-r ${
                  isDark
                    ? "from-[#121316] via-[#121316]/60 to-transparent"
                    : "from-[#f8fafc] via-[#f8fafc]/60 to-transparent"
                }`}
              />
            </div>

            <div className="absolute top-0 left-0 w-full sm:w-[76%] md:w-[68%] lg:w-[62%] h-full z-10 pointer-events-auto">
              <TechText
                text="Inkloom AI"
                align="left"
                fontWeight={600}
                fontSize={162}
                reveal="letter"
                dashLength={4}
                dashGap={2}
                specks={8}
                intro="metrics"
                introDuration={2.8}
                clickKick
                guides
                fontFamily="Georgia, serif"
                letterSpacing={-0.02}
                lineStyle="solid"
                strokeWidth={1.5}
                bounce={0.75}
                color={isDark ? "#f8fafc" : "#0f172a"}
                accentColor={isDark ? "#a78bfa" : "#005797"}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2">
              <Link
                href="/judge"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                Launch Judge Evaluation Canvas
              </Link>
            </div>
          </section>

          {/* Top Metric KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-sans text-xs uppercase tracking-wider font-semibold ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                  Total Submissions
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                  <span className="material-symbols-outlined text-[20px]">folder_copy</span>
                </div>
              </div>
              <div className="my-3 flex items-baseline justify-between">
                <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${isDark ? "text-white" : "text-[#111827]"}`}>
                  {isLoading ? "..." : totalSubmissions}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold ${totalSubmissions > 0 ? (isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary") : (isDark ? "bg-[#292a2d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]")}`}>
                  {totalSubmissions > 0 ? "Audited Assets" : "No Audits Yet"}
                </span>
              </div>
              <div className={`pt-2.5 border-t font-sans text-xs ${isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                <span>Assets ingested for brand governance</span>
              </div>
            </div>

            <div
              className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-sans text-xs uppercase tracking-wider font-semibold ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                  Compliance Score
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
              </div>
              <div className="my-3 flex items-baseline justify-between">
                <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${isDark ? "text-white" : "text-[#111827]"}`}>
                  {isLoading ? "..." : `${Math.round(avgComplianceScore) || 92}%`}
                </span>
                <span className="px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Target: 90%
                </span>
              </div>
              <div className={`pt-2.5 border-t font-sans text-xs ${isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                <span>Average across active policies</span>
              </div>
            </div>

            <div
              className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-sans text-xs uppercase tracking-wider font-semibold ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                  Open Violations
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-600"}`}>
                  <span className="material-symbols-outlined text-[20px]">report_problem</span>
                </div>
              </div>
              <div className="my-3 flex items-baseline justify-between">
                <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${isDark ? "text-white" : "text-[#111827]"}`}>
                  {isLoading ? "..." : openFindingsCount}
                </span>
                <span className="px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400">
                  {openFindingsCount > 0 ? "Requires Review" : "All Clear"}
                </span>
              </div>
              <div className={`pt-2.5 border-t font-sans text-xs ${isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                <span>Unresolved compliance findings</span>
              </div>
            </div>

            <div
              className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-sans text-xs uppercase tracking-wider font-semibold ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                  Active Guidelines
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                  <span className="material-symbols-outlined text-[20px]">book</span>
                </div>
              </div>
              <div className="my-3 flex items-baseline justify-between">
                <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${isDark ? "text-white" : "text-[#111827]"}`}>
                  {analytics?.active_guidelines_count || 12}
                </span>
                <span className="px-2 py-0.5 rounded-full font-sans text-[11px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  Vector Chunks
                </span>
              </div>
              <div className={`pt-2.5 border-t font-sans text-xs ${isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                <span>Indexed in pgvector RAG index</span>
              </div>
            </div>
          </div>

          {/* Platform Admin View Selector: Our Clients | Submissions | Future Pipeline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-palette-7/30 border border-border">
              <button
                type="button"
                onClick={() => setAdminTab("clients")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  adminTab === "clients"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-palette-7/40"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">corporate_fare</span>
                Our Clients ({brands.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("submissions")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  adminTab === "submissions"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-palette-7/40"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">rule_folder</span>
                Client Submissions ({submissions.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("pipeline")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  adminTab === "pipeline"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-on-surface hover:bg-palette-7/40"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">rocket_launch</span>
                Future Clients & Pipeline (5)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/setup"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-[#004578] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                + Onboard New Client
              </Link>
            </div>
          </div>

          {/* TAB 1: OUR CLIENTS & ACTIVE TENANTS */}
          {adminTab === "clients" && (
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map((b) => {
                  const isCurrentActive = b.id === activeBrandId;
                  const clientSubs = submissions.filter((s) => s.brand_id === b.id);
                  return (
                    <div
                      key={b.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCurrentActive
                          ? "border-primary/80 ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                          : isDark
                          ? "bg-[#1b1b1f] border-[#3b3c44] hover:border-[#4f505b]"
                          : "bg-white border-[#cbd5e1] hover:border-slate-400"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                              {b.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-on-surface leading-tight">{b.name}</h4>
                              <span className="text-[11px] text-text-muted">{b.industry || "Enterprise Brand"}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCurrentActive
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-palette-7/40 text-text-muted"
                            }`}
                          >
                            {isCurrentActive ? "● Active Tenant" : "Configured"}
                          </span>
                        </div>

                        <p className="text-xs text-text-muted line-clamp-2 mb-4 leading-relaxed">
                          {b.tone_persona || "Autonomous brand governance guidelines and multi-modal compliance configured."}
                        </p>

                        {/* Palette swatches */}
                        {b.approved_hex_palette && b.approved_hex_palette.length > 0 && (
                          <div className="mb-4">
                            <span className="text-[10px] uppercase font-mono font-semibold text-text-muted block mb-1.5">
                              Approved Colors
                            </span>
                            <div className="flex items-center gap-1.5">
                              {b.approved_hex_palette.slice(0, 5).map((color, idx) => (
                                <div
                                  key={idx}
                                  className="w-5 h-5 rounded-md border border-border shadow-2xs"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Client Metric Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs mb-4">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-text-muted block">Submissions</span>
                            <span className="font-mono font-bold text-on-surface">{clientSubs.length} Audited</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-text-muted block">Policy Chunks</span>
                            <span className="font-mono font-bold text-primary">110 Indexed</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBrandId(b.id);
                            setAdminTab("submissions");
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isCurrentActive
                              ? "bg-primary text-white hover:bg-[#004578]"
                              : "border border-border text-on-surface hover:bg-palette-7/30"
                          }`}
                        >
                          {isCurrentActive ? "Active Workspace" : "Switch to Brand"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Client Card */}
                <Link
                  href="/setup"
                  className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                    isDark
                      ? "border-[#3b3c44] hover:border-primary bg-[#14151a]/50"
                      : "border-slate-300 hover:border-primary bg-slate-50/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">add_business</span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface mb-1">Onboard New Client</h4>
                  <p className="text-xs text-text-muted max-w-xs mb-3">
                    Ingest brand guidelines, configure color palettes, extract policy rules and launch an autonomous tenant workspace.
                  </p>
                  <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline">
                    Launch Client Onboarding Wizard →
                  </span>
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENT SUBMISSIONS & REVIEWS */}
          {adminTab === "submissions" && (
            <div className="space-y-6 mb-8">
              {/* Interactive Trend Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div
                  className={`lg:col-span-8 rounded-xl p-5 border shadow-2xs ${
                    isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className={`font-sans text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                        Compliance Score Progression
                      </h3>
                      <p className={`font-sans text-xs ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                        Chronological compliance audit history across submissions
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isDark ? "#7c3aed" : "#005797"} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={isDark ? "#7c3aed" : "#005797"} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2e2f38" : "#f1f5f9"} />
                          <XAxis dataKey="run" stroke={isDark ? "#6b7280" : "#9ca3af"} fontSize={11} />
                          <YAxis domain={[50, 100]} stroke={isDark ? "#6b7280" : "#9ca3af"} fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? "#1f2026" : "#ffffff",
                              borderColor: isDark ? "#383a45" : "#e2e8f0",
                              borderRadius: "0.5rem",
                              fontSize: "12px",
                            }}
                          />
                          <ReferenceLine y={90} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Target (90%)", fill: "#10b981", fontSize: 10 }} />
                          <Area type="monotone" dataKey="compliance" stroke={isDark ? "#7c3aed" : "#005797"} strokeWidth={2.5} fillOpacity={1} fill="url(#complianceGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-text-muted">Loading chart...</div>
                    )}
                  </div>
                </div>

                {/* Top Violations Breakdown */}
                <div
                  className={`lg:col-span-4 rounded-xl p-5 border shadow-2xs ${
                    isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-sans text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                      Top Violations
                    </h3>
                    <span className="text-[11px] font-mono text-text-muted">{totalCategoryViolations} Total</span>
                  </div>

                  <div className="space-y-3">
                    {categoryEntries.length === 0 ? (
                      <p className="text-xs text-text-muted py-6 text-center">No violations logged for this brand.</p>
                    ) : (
                      categoryEntries.slice(0, 4).map(([cat, count]) => {
                        const pct = Math.round((count / totalCategoryViolations) * 100);
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="capitalize">{cat.replace("_", " ")}</span>
                              <span className="font-mono text-text-muted">{pct}% ({count})</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-palette-7/30 overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Multi-Modal Submissions Table */}
              <div
                className={`rounded-2xl border overflow-hidden shadow-xs ${
                  isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
                }`}
              >
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">Client Submissions Review Queue</h3>
                    <p className="text-[11px] text-text-muted">Direct superuser override authority — approve or reject submissions without leaving the dashboard</p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-palette-7/30 text-text-muted">
                    {submissions.length} Total
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr
                        className={`text-[10px] font-mono uppercase tracking-wider font-semibold border-b ${
                          isDark ? "bg-[#14151a] text-text-muted border-[#2e2f38]" : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Author / Format</th>
                        <th className="py-3 px-4">Findings</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-border">
                      {topSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-palette-7/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface">{sub.title}</div>
                            <div className="text-[11px] font-mono text-text-muted">SUB-#{sub.id} · v{sub.current_version}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-on-surface">{sub.creator_name}</div>
                            <span className="text-[10px] font-mono uppercase text-text-muted">{sub.content_format}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono font-bold text-text-muted">
                              {sub.findings?.length || 0} Flags
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {sub.compliance_score != null ? `${sub.compliance_score}%` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-palette-7/40">
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(sub.id, "APPROVED")}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-2xs"
                              >
                                ✓ Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(sub.id, "CHANGES_REQUESTED")}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer transition-colors shadow-2xs"
                              >
                                ✕ Reject
                              </button>
                              <Link
                                href={`/audit?id=${sub.id}`}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border hover:border-primary text-text-muted hover:text-on-surface"
                              >
                                Audit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FUTURE CLIENTS & ENTERPRISE PIPELINE */}
          {adminTab === "pipeline" && (
            <div className="space-y-6 mb-8">
              <div className="p-5 rounded-2xl border bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">rocket_launch</span>
                      Enterprise Expansion Pipeline
                    </h3>
                    <p className="text-xs text-text-muted mt-1 max-w-xl">
                      Future clients pre-analyzed for autonomous brand governance. Platform creators can provision an instant isolated workspace with one click.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 self-start sm:self-auto">
                    5 High-Value Prospects
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureClients.map((client) => {
                  const isAlreadyCreated = brands.some((b) => b.name.toLowerCase() === client.name.toLowerCase());
                  const isProcessing = provisioningName === client.name;

                  return (
                    <div
                      key={client.name}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isDark ? "bg-[#1b1b1f] border-[#3b3c44] hover:border-[#4f505b]" : "bg-white border-[#cbd5e1] hover:border-slate-400"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div>
                            <h4 className="font-bold text-base text-on-surface leading-tight">{client.name}</h4>
                            <span className="text-[11px] font-mono text-text-muted">{client.industry}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            {client.fitScore}
                          </span>
                        </div>

                        <p className="text-xs text-text-muted leading-relaxed mb-3">
                          {client.description}
                        </p>

                        {/* Tone & Palette */}
                        <div className="space-y-2 mb-4 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-text-muted block font-semibold">
                              Target Tone & Persona
                            </span>
                            <span className="text-xs text-on-surface line-clamp-1">{client.tone}</span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-mono text-text-muted block font-semibold mb-1">
                              Proposed Palette
                            </span>
                            <div className="flex items-center gap-1.5">
                              {client.palette.map((hex, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-4 rounded border border-border shadow-2xs"
                                  style={{ backgroundColor: hex }}
                                  title={hex}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-[11px] text-text-muted font-medium">Pipeline Stage:</span>
                            <span className="text-[11px] font-bold text-primary font-mono">{client.pipelineStatus}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border">
                        {isAlreadyCreated ? (
                          <button
                            type="button"
                            onClick={() => {
                              const found = brands.find((b) => b.name.toLowerCase() === client.name.toLowerCase());
                              if (found) {
                                setActiveBrandId(found.id);
                                setAdminTab("clients");
                              }
                            }}
                            className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                          >
                            ✓ Workspace Live (Switch)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleProvisionProspect(client)}
                            disabled={isProcessing}
                            className="w-full py-2 rounded-xl text-xs font-bold bg-primary hover:bg-[#004578] text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {isProcessing ? "Provisioning Workspace..." : "+ Provision Client Workspace"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
