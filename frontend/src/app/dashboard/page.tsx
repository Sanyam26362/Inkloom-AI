"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { GovernanceAnalytics, Submission, SubmissionStatus } from "@/lib/types";
import TechText from "@/components/ui/TechText";
import DriftWall from "@/components/ui/DriftWall";

const resolveMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://inkloom-ai-backend.onrender.com").replace(/\/api\/v1\/?$/, "");
    return url.replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/, base);
  }
  return url;
};

export default function GovernanceDashboardPage() {
  const { user, activeBrandId, currentRole, setCurrentRole, brands, theme, refreshKey, setActiveBrandId, refreshBrands } = useApp();
  const [expandedSubId, setExpandedSubId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const highlight = params.get("highlight");
      if (view === "brand" && currentRole !== "REVIEWER" && currentRole !== "MANAGER") {
        setCurrentRole("REVIEWER");
      }
      if (highlight) {
        setExpandedSubId(parseInt(highlight, 10));
      }
    }
  }, [currentRole, setCurrentRole]);
  const isDark = theme === "dark";
  const activeBrandReady = activeBrandId > 0 && brands.some((brand) => brand.id === activeBrandId);

  const isCreator = currentRole === "CREATOR";
  const isBrand = currentRole === "REVIEWER" || currentRole === "MANAGER";
  const isAdmin = currentRole === "ADMIN" || currentRole === "JUDGE";

  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isResettingDb, setIsResettingDb] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);

  const handleResetDatabase = async () => {
    setIsResettingDb(true);
    setError(null);
    try {
      await api.resetDatabase({ userRole: currentRole });
      setResetSuccessToast("Database wiped and clean Blinkit brand pack restored!");
      setTimeout(() => setResetSuccessToast(null), 6000);
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to reset database: ${msg}`);
    } finally {
      setIsResettingDb(false);
      setShowResetConfirm(false);
    }
  };

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
      className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${
        isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 border-3 border-black bg-[var(--red)] text-white shadow-[4px_4px_0px_#000000] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] shrink-0 mt-0.5">error</span>
            <div>
              <span className="font-mono text-xs uppercase font-black tracking-wider block">
                BACKEND COMMUNICATION WARNING
              </span>
              <p className="font-mono text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 border-2 border-black bg-white text-black text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer shrink-0"
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
            className={`p-5 sm:p-6 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 border-2 border-black bg-[var(--green)] text-[var(--ink)] text-[10px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                  CREATOR STUDIO // BLINKIT PARTNER
                </span>
                <span className="text-xs font-mono font-bold text-[#666] dark:text-[#999]">DIWALI 2026 CAMPAIGN</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-archivo font-black uppercase tracking-tight text-[var(--ink)] dark:text-white">
                Creative Submissions &amp; Policy Feedback
              </h1>
              <p className="mt-1 text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-2xl leading-relaxed">
                Track promotional briefs, posters, audio voiceovers, and video reels. Inspect automated pre-flight checks, review judge decisions, and resolve policy issues.
              </p>
            </div>

            <Link
              href="/content"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 border-3 border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              + Upload New Creative
            </Link>
          </div>

          {/* Creator KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[#666] dark:text-[#888] mb-1">
                <span>Total Uploads</span>
                <span className="material-symbols-outlined text-[18px]">folder_copy</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--ink)] dark:text-white">{submissions.length}</div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Collateral submitted</p>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[var(--ink)] dark:text-[#b9f4a8] mb-1">
                <span>Approved by Judge</span>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--ink)] dark:text-[#b9f4a8]">
                {approvedSubmissions.length}
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Ready for publication</p>
            </div>

            <div
              className={`p-4 border-3 border-black ${
                rejectedSubmissions.length > 0
                  ? "bg-[var(--red)]/20 shadow-[4px_4px_0px_#000]"
                  : isDark
                  ? "bg-[#1c1d22] shadow-[4px_4px_0px_#000]"
                  : "bg-[var(--white)] shadow-[4px_4px_0px_#000]"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-black uppercase text-[var(--red)] dark:text-[#ff7b72] mb-1">
                <span>Action Required</span>
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--red)] dark:text-[#ff7b72]">
                {rejectedSubmissions.length}
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">See reasons below to fix</p>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[#666] dark:text-[#ffdb1f] mb-1">
                <span>Under Review</span>
                <span className="material-symbols-outlined text-[18px]">pending</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--ink)] dark:text-[#ffdb1f]">
                {pendingReviewSubmissions.length}
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Awaiting judge evaluation</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b-3 border-black pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCreatorTab("ALL")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                creatorTab === "ALL"
                  ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              All Submissions ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setCreatorTab("REJECTED")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                creatorTab === "REJECTED"
                  ? "bg-[var(--red)] text-white shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-[var(--red)] dark:text-[#ff7b72] shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Rejected by Judge ({rejectedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setCreatorTab("APPROVED")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                creatorTab === "APPROVED"
                  ? "bg-[var(--green)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-black dark:text-[#b9f4a8] shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Approved ({approvedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setCreatorTab("REVIEW")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                creatorTab === "REVIEW"
                  ? "bg-[var(--blue)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
              In Review ({pendingReviewSubmissions.length})
            </button>
          </div>

          {/* Submissions Cards List with Rejection Feedback */}
          {filteredCreatorSubmissions.length === 0 ? (
            <div className={`py-12 text-center border-4 border-dashed border-black ${isDark ? "bg-[#18191f]" : "bg-[var(--white)]"}`}>
              <span className="material-symbols-outlined text-[42px] text-[#666] dark:text-[#888] mb-2">folder_open</span>
              <p className="text-sm font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                No submissions found in this view
              </p>
              <p className="text-xs font-mono text-[#666] dark:text-[#999] mt-1 max-w-sm mx-auto">
                {creatorTab === "REJECTED"
                  ? "Zero rejections! None of your creative submissions are currently marked as rejected."
                  : "Submit your first creative asset for the Blinkit Diwali campaign."}
              </p>
              <Link
                href="/content"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
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
                    className={`p-4 sm:p-5 border-3 border-black transition-all ${
                      isRejected
                        ? "bg-[var(--red)]/10 shadow-[4px_4px_0px_#000]"
                        : isApproved
                        ? "bg-[var(--green)]/10 shadow-[4px_4px_0px_#000]"
                        : isDark
                        ? "bg-[#18191f] shadow-[4px_4px_0px_#000]"
                        : "bg-[var(--white)] shadow-[4px_4px_0px_#000]"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] ${
                            sub.content_format === "IMAGE"
                              ? "bg-[var(--blue)] text-black"
                              : sub.content_format === "VIDEO"
                              ? "bg-[var(--pink)] text-black"
                              : sub.content_format === "AUDIO"
                              ? "bg-[var(--yellow)] text-black"
                              : "bg-[var(--green)] text-black"
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-mono font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                              {sub.title}
                            </h3>
                            {(user?.user_name && sub.creator_name === user.user_name) && (
                              <span className="px-1.5 py-0.2 border border-black bg-[var(--yellow)] text-black text-[9px] font-black uppercase shadow-[1px_1px_0px_#000]">
                                Your Submission
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#666] dark:text-[#999] mt-0.5 flex-wrap">
                            <span className="font-bold">SUB-#{sub.id}</span>
                            <span>•</span>
                            <span className="font-black uppercase">{sub.content_format}</span>
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
                            <span className="text-[9px] font-mono uppercase text-[#666] dark:text-[#888] block">SCORE</span>
                            <span
                              className={`font-mono text-sm font-black ${
                                sub.compliance_score >= 80
                                  ? "text-[var(--ink)] dark:text-[#b9f4a8]"
                                  : sub.compliance_score >= 60
                                  ? "text-black dark:text-[#ffdb1f]"
                                  : "text-[var(--red)] dark:text-[#ff7b72]"
                              }`}
                            >
                              {sub.compliance_score}%
                            </span>
                          </div>
                        )}

                        <span
                          className={`px-2.5 py-1 border-2 border-black text-[10px] font-mono font-black uppercase shadow-[2px_2px_0px_#000] ${
                            isApproved
                              ? "bg-[var(--green)] text-black"
                              : isRejected
                              ? "bg-[var(--red)] text-white"
                              : "bg-[var(--yellow)] text-black"
                          }`}
                        >
                          {isApproved
                            ? "Approved"
                            : isRejected
                            ? "Rejected by Judge"
                            : "Under Review"}
                        </span>
                      </div>
                    </div>

                    {/* REJECTION REASON & JUDGE FEEDBACK BOX */}
                    {isRejected && (
                      <div className="mt-3.5 p-3.5 border-2 border-black bg-[var(--red)]/15 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[20px] text-[var(--red)] shrink-0">
                            gavel
                          </span>
                          <div>
                            <h4 className="font-mono font-black text-xs uppercase text-[var(--red)] dark:text-[#ff7b72]">
                              Why the Judge / Reviewer Rejected This Submission:
                            </h4>
                            <p className="text-xs font-mono text-[#333] dark:text-[#c9d1d9] mt-0.5 leading-relaxed">
                              This asset failed Blinkit Diwali brand governance rules. Review policy findings below and revise copy or visual elements before re-submitting.
                            </p>
                          </div>
                        </div>

                        {/* Findings list explaining exact reason */}
                        {sub.findings && sub.findings.length > 0 && (
                          <div className="space-y-2 pt-1 border-t-2 border-black/20">
                            {sub.findings.slice(0, 3).map((f) => (
                              <div
                                key={f.id}
                                className="p-2.5 border border-black bg-white dark:bg-[#121316] text-xs space-y-1 font-mono"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 border border-black text-[9px] font-black uppercase ${
                                      f.severity === "CRITICAL"
                                        ? "bg-[var(--red)] text-white"
                                        : "bg-[var(--yellow)] text-black"
                                    }`}
                                  >
                                    {f.severity}
                                  </span>
                                  <span className="font-bold text-[var(--ink)] dark:text-white uppercase">
                                    {f.category.replace("_", " ")} Policy
                                  </span>
                                </div>
                                {f.flagged_excerpt && (
                                  <p className="p-1 border border-black bg-[var(--red)]/10 text-[11px] font-bold text-[var(--red)]">
                                    “{f.flagged_excerpt}”
                                  </p>
                                )}
                                <p className="text-[11px] text-[#444] dark:text-[#a0a5b5] leading-relaxed">
                                  <span className="font-bold text-black dark:text-white">Reason: </span>
                                  {f.explanation}
                                </p>
                                {f.suggested_correction && (
                                  <p className="text-[11px] font-bold text-[var(--ink)] dark:text-[#b9f4a8] leading-relaxed">
                                    <span>Fix: </span>“{f.suggested_correction}”
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action CTA */}
                        <div className="flex items-center justify-between pt-1 border-t border-black/20 text-xs font-mono">
                          <span className="font-bold text-[var(--red)] dark:text-[#ff7b72]">
                            {criticalCount} Critical, {warningCount} Warning flags
                          </span>
                          <Link
                            href={`/audit?id=${sub.id}&event=diwali`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-[var(--red)] text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                          >
                            <span>Fix &amp; Re-Audit in Workspace →</span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* APPROVED NOTICE */}
                    {isApproved && (
                      <div className="mt-3.5 p-3 border-2 border-black bg-[var(--green)]/20 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 font-bold text-black dark:text-white">
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                          <span>Passed brand compliance checks. Cleared for Blinkit marketing channels.</span>
                        </div>
                        <Link
                          href={`/audit?id=${sub.id}`}
                          className="font-black uppercase underline hover:opacity-80 shrink-0"
                        >
                          View Certificate →
                        </Link>
                      </div>
                    )}

                    {/* IN REVIEW NOTICE */}
                    {!isApproved && !isRejected && (
                      <div className="mt-3.5 p-3 border-2 border-black bg-[var(--yellow)]/20 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 font-bold text-black dark:text-white">
                          <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                          <span>AI pre-flight check completed. In queue for Blinkit Brand Reviewer sign-off.</span>
                        </div>
                        <Link
                          href={`/audit?id=${sub.id}`}
                          className="font-black uppercase underline hover:opacity-80 shrink-0"
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
            className={`p-5 sm:p-6 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 border-2 border-black bg-[var(--blue)] text-black text-[10px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                  BRAND GOVERNANCE PANEL
                </span>
                <span className="text-xs font-mono font-black text-[var(--ink)] dark:text-white">
                  {brands.find((b) => b.id === activeBrandId)?.name || "Blinkit"} ACTIVE TENANT
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-archivo font-black uppercase tracking-tight text-[var(--ink)] dark:text-white">
                Content Uploaded by Agency Creators
              </h1>
              <p className="mt-1 text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-2xl leading-relaxed">
                Review, approve, or request revisions on multi-modal copy, posters, and reels uploaded by agency creators before publication on public channels.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={isResettingDb}
                className="px-3 py-2 border-2 border-black bg-[var(--red)] hover:bg-[#ff3333] text-white text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Wipe database and re-seed clean default state"
              >
                <span className={`material-symbols-outlined text-[16px] ${isResettingDb ? "animate-spin" : ""}`}>
                  {isResettingDb ? "sync" : "delete_forever"}
                </span>
                {isResettingDb ? "Wiping DB..." : "Reset Database"}
              </button>
              <Link
                href="/guidelines"
                className="px-3.5 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Guidelines
              </Link>
              <Link
                href="/audit"
                className="px-3.5 py-2 border-2 border-black bg-[var(--yellow)] text-black text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Full Audit Queue
              </Link>
            </div>
          </div>

          {/* Brand KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[#666] dark:text-[#888] mb-1">
                <span>Avg Compliance</span>
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--ink)] dark:text-[#b9f4a8]">
                {Math.round(avgComplianceScore) || 92}%
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Across all audited assets</p>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[#666] dark:text-[#ffdb1f] mb-1">
                <span>Awaiting Review</span>
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--ink)] dark:text-[#ffdb1f]">
                {pendingReviewSubmissions.length}
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Needs reviewer action</p>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[var(--ink)] dark:text-[#b9f4a8] mb-1">
                <span>Approved Content</span>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--ink)] dark:text-[#b9f4a8]">
                {approvedSubmissions.length}
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Cleared for publication</p>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000]`}>
              <div className="flex items-center justify-between text-xs font-black uppercase text-[var(--red)] dark:text-[#ff7b72] mb-1">
                <span>Changes Requested</span>
                <span className="material-symbols-outlined text-[18px]">replay</span>
              </div>
              <div className="text-3xl font-mono font-black text-[var(--red)] dark:text-[#ff7b72]">
                {rejectedSubmissions.length}
              </div>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">Revisions sent to creator</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b-3 border-black pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setBrandTab("ALL")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                brandTab === "ALL"
                  ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              All Submissions ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setBrandTab("PENDING")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                brandTab === "PENDING"
                  ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              Awaiting Review ({pendingReviewSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setBrandTab("APPROVED")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                brandTab === "APPROVED"
                  ? "bg-[var(--green)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Approved ({approvedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setBrandTab("REJECTED")}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                brandTab === "REJECTED"
                  ? "bg-[var(--red)] text-white shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                  : "bg-white dark:bg-[#1c1d22] text-[var(--red)] dark:text-[#ff7b72] shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              Changes Requested ({rejectedSubmissions.length})
            </button>
          </div>

          {/* Submissions Table for Brand Reviewer */}
          <div
            className={`border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            } overflow-hidden`}
          >
            <div className="overflow-x-auto">
              {filteredBrandSubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-[36px] text-[#666] dark:text-[#888] mb-1">inbox</span>
                  <p className="text-sm font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                    No creator submissions in this queue
                  </p>
                  <p className="text-xs font-mono text-[#666] dark:text-[#999] mt-0.5">
                    Submissions will appear here as creators upload content.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px] font-mono text-xs">
                  <thead>
                    <tr className="border-b-3 border-black bg-[var(--ink)] text-white uppercase text-[10px] font-black tracking-wider">
                      <th className="py-3 px-4">Asset / Title</th>
                      <th className="py-3 px-4">Creator / Format</th>
                      <th className="py-3 px-4">Audit Score</th>
                      <th className="py-3 px-4">Findings</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Review Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black">
                    {filteredBrandSubmissions.map((sub) => {
                      const criticalFindings =
                        sub.findings?.filter((f) => f.severity === "CRITICAL").length || 0;
                      const warningFindings =
                        sub.findings?.filter((f) => f.severity === "WARNING").length || 0;

                      return (
                        <React.Fragment key={sub.id}>
                        <tr
                          className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                            updatingId === sub.id ? "opacity-50" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const thumbUrl = resolveMediaUrl(sub.revisions?.find((r) => r.media_urls && r.media_urls.length > 0)?.media_urls?.[0] || sub.revisions?.[0]?.media_urls?.[0]);
                                return thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt={sub.title}
                                    className="w-12 h-12 object-cover border-2 border-black shrink-0 shadow-[1px_1px_0px_#000] bg-black"
                                    onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 border-2 border-black bg-[var(--yellow)]/30 shrink-0 flex items-center justify-center shadow-[1px_1px_0px_#000]">
                                    <span className="material-symbols-outlined text-[20px]">
                                      {sub.content_format === "IMAGE" ? "image" : "description"}
                                    </span>
                                  </div>
                                );
                              })()}
                              <div>
                                <div className="font-bold text-sm text-[var(--ink)] dark:text-white uppercase">{sub.title}</div>
                                <div className="text-[10px] text-[#666] dark:text-[#999]">
                                  SUB-#{sub.id} · v{sub.current_version} · {new Date(sub.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-[var(--ink)] dark:text-white">{sub.creator_name || "Agency Creator"}</div>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 border border-black bg-[var(--yellow)] text-black">
                              {sub.content_format}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-black">
                            {sub.compliance_score != null ? (
                              <span
                                className={
                                  sub.compliance_score >= 80
                                    ? "text-[var(--ink)] dark:text-[#b9f4a8]"
                                    : sub.compliance_score >= 60
                                    ? "text-black dark:text-[#ffdb1f]"
                                    : "text-[var(--red)] dark:text-[#ff7b72]"
                                }
                              >
                                {sub.compliance_score}%
                              </span>
                            ) : (
                              <span className="text-[#666]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {criticalFindings > 0 && (
                                <span className="px-1.5 py-0.5 border border-black bg-[var(--red)] text-white text-[9px] font-black">
                                  {criticalFindings} Crit
                                </span>
                              )}
                              {warningFindings > 0 && (
                                <span className="px-1.5 py-0.5 border border-black bg-[var(--yellow)] text-black text-[9px] font-black">
                                  {warningFindings} Warn
                                </span>
                              )}
                              {criticalFindings === 0 && warningFindings === 0 && (
                                <span className="text-[var(--ink)] dark:text-[#b9f4a8] text-[10px] font-black">
                                  ✓ Clean
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 border border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_#000] ${
                                sub.status === "APPROVED"
                                  ? "bg-[var(--green)] text-black"
                                  : sub.status === "CHANGES_REQUESTED" || sub.status === "REJECTED"
                                  ? "bg-[var(--red)] text-white"
                                  : "bg-[var(--yellow)] text-black"
                              }`}
                            >
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {sub.status === "APPROVED" ? (
                                <span className="px-2 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--green)]/60 text-black">
                                  ✓ Approved
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusUpdate(sub.id, "APPROVED")}
                                  disabled={updatingId === sub.id}
                                  className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--green)] hover:bg-[#a6ec93] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
                                  title="Approve submission"
                                >
                                  ✓ Approve
                                </button>
                              )}

                              {sub.status === "CHANGES_REQUESTED" || sub.status === "REJECTED" ? (
                                <button
                                  type="button"
                                  onClick={() => setRejectingSub(sub)}
                                  disabled={updatingId === sub.id}
                                  className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--red)] text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                                  title="Update rejection notes"
                                >
                                  ✕ Rejected (Edit)
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setRejectingSub(sub)}
                                  disabled={updatingId === sub.id}
                                  className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--red)] hover:bg-[#ff3333] text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
                                  title="Reject with feedback"
                                >
                                  ✕ Reject
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                                className={`px-2 py-1 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer ${
                                  expandedSubId === sub.id
                                    ? "bg-[var(--yellow)] text-black"
                                    : "bg-white dark:bg-[#1c1d22] text-black dark:text-white"
                                }`}
                                title="Inspect every detail and findings"
                              >
                                {expandedSubId === sub.id ? "▲ Less" : "▼ Details"}
                              </button>

                              <Link
                                href={`/audit?id=${sub.id}`}
                                className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--yellow)] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                              >
                                Audit
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {expandedSubId === sub.id && (
                          <tr className="bg-black/5 dark:bg-white/5 border-b-3 border-black">
                            <td colSpan={6} className="p-4 sm:p-5">
                              <div className="border-3 border-black bg-white dark:bg-[#141518] p-4 sm:p-5 shadow-[4px_4px_0px_#000] text-left font-mono">
                                <div className="flex flex-col md:flex-row gap-5 items-start">
                                  {/* Media Thumbnail */}
                                  {(() => {
                                    const drawerMediaUrl = resolveMediaUrl(sub.revisions?.find((r) => r.media_urls && r.media_urls.length > 0)?.media_urls?.[0] || sub.revisions?.[0]?.media_urls?.[0]);
                                    return drawerMediaUrl ? (
                                      <div className="w-48 shrink-0 border-2 border-black shadow-[2px_2px_0px_#000] overflow-hidden bg-black">
                                        <img
                                          src={drawerMediaUrl}
                                          alt={sub.title}
                                          className="w-full h-auto object-cover max-h-60"
                                          onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; }}
                                        />
                                        <div className="p-1.5 bg-[var(--ink)] text-[9px] text-white font-mono text-center truncate">
                                          Asset Preview
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-40 h-32 shrink-0 border-2 border-black bg-[var(--yellow)]/20 flex flex-col items-center justify-center text-center p-3 shadow-[2px_2px_0px_#000]">
                                        <span className="material-symbols-outlined text-[32px] mb-1">image</span>
                                        <span className="text-[10px] font-black uppercase">{sub.content_format}</span>
                                      </div>
                                    );
                                  })()}

                                  {/* Submission Details & Findings */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-2 mb-3">
                                      <div>
                                        <h4 className="font-archivo font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                                          {sub.title}
                                        </h4>
                                        <span className="text-[10px] text-[#666] dark:text-[#999]">
                                          Creator: <strong className="text-black dark:text-white">{sub.creator_name}</strong> · Version {sub.current_version} · Status: <span className="font-black uppercase">{sub.status.replace("_", " ")}</span>
                                        </span>
                                      </div>
                                      <span className="text-xs font-black px-2.5 py-1 border-2 border-black bg-[var(--yellow)] text-black shadow-[2px_2px_0px_#000]">
                                        COMPLIANCE SCORE: {sub.compliance_score ?? 0}%
                                      </span>
                                    </div>

                                    {/* Content Copy Excerpt */}
                                    {(() => {
                                      const drawerCopy = sub.revisions?.find((r) => r.content_body && r.content_body !== "Visual Image Asset")?.content_body || sub.revisions?.[0]?.content_body;
                                      return drawerCopy ? (
                                        <div className="mb-3 p-2.5 border-2 border-black bg-black/5 dark:bg-white/5 text-xs text-[var(--ink)] dark:text-[#e0e0e0] leading-relaxed">
                                          <span className="text-[9px] font-black uppercase text-[#666] dark:text-[#888] block mb-1">
                                            SUBMISSION COPY:
                                          </span>
                                          &ldquo;{drawerCopy}&rdquo;
                                        </div>
                                      ) : null;
                                    })()}

                                    {/* Detailed Findings List */}
                                    <div>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-[#666] dark:text-[#888] block mb-1.5">
                                        GOVERNANCE POLICY FINDINGS ({sub.findings?.length || 0}):
                                      </span>
                                      {sub.findings && sub.findings.length > 0 ? (
                                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                          {sub.findings.map((f, fIdx) => (
                                            <div
                                              key={fIdx}
                                              className={`p-2.5 border-2 border-black text-xs ${
                                                f.severity === "CRITICAL"
                                                  ? "bg-[var(--red)]/15 border-[var(--red)]"
                                                  : f.severity === "WARNING"
                                                  ? "bg-[var(--yellow)]/20 border-black"
                                                  : "bg-blue-500/10 border-blue-400"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className="font-black text-[9px] uppercase px-1.5 py-0.2 border border-black bg-black text-white">
                                                  {f.severity} // {f.category}
                                                </span>
                                                {f.guideline_citation && (
                                                  <span className="text-[9px] text-[#666] dark:text-[#999] truncate max-w-[220px]">
                                                    {f.guideline_citation}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="font-bold text-[11px] text-[var(--ink)] dark:text-white">
                                                "{f.flagged_excerpt}"
                                              </p>
                                              <p className="text-[10px] text-[#555] dark:text-[#bbb] mt-0.5">
                                                {f.explanation}
                                              </p>
                                              {f.suggested_correction && (
                                                <div className="mt-1 text-[10px] text-[var(--green)] dark:text-[#8ce99a] font-bold">
                                                  ✓ Suggested Fix: "{f.suggested_correction}"
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="p-2.5 border-2 border-black bg-[var(--green)]/20 text-xs font-bold text-black dark:text-[#b9f4a8]">
                                          ✓ Zero violations detected. Asset conforms to brand specifications.
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t-2 border-black/10 flex-wrap">
                                      <div className="text-[10px] text-[#666] dark:text-[#999]">
                                        ID: <span className="font-bold">SUB-#{sub.id}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleQuickStatusUpdate(sub.id, "APPROVED")}
                                          className="px-3.5 py-1.5 border-2 border-black text-xs font-black uppercase bg-[var(--green)] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                                        >
                                          ✓ Approve Asset
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setRejectingSub(sub)}
                                          className="px-3.5 py-1.5 border-2 border-black text-xs font-black uppercase bg-[var(--red)] text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                                        >
                                          ✕ Request Changes / Reject
                                        </button>
                                        <Link
                                          href={`/audit?id=${sub.id}`}
                                          className="px-3.5 py-1.5 border-2 border-black text-xs font-black uppercase bg-[var(--yellow)] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                                        >
                                          Full Audit Studio →
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Rejection Modal for Brand Reviewer */}
          {rejectingSub && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-mono">
              <div
                className={`relative w-full max-w-lg p-5 sm:p-6 border-4 border-black shadow-[8px_8px_0px_#000000] ${
                  isDark ? "bg-[#141518] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
                  <div className="flex items-center gap-2 text-[var(--red)] dark:text-[#ff7b72]">
                    <span className="material-symbols-outlined">feedback</span>
                    <h3 className="font-mono font-black text-sm uppercase">REQUEST CHANGES ON SUBMISSION</h3>
                  </div>
                  <button
                    onClick={() => setRejectingSub(null)}
                    className="w-6 h-6 border-2 border-black bg-[var(--red)] text-white font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#666] dark:text-[#888]">TARGET ASSET:</span>
                    <p className="font-bold text-sm text-[var(--ink)] dark:text-white uppercase">{rejectingSub.title}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[var(--ink)] dark:text-white mb-1">
                      Reason for Rejection / Revision Instructions:
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="e.g. Please replace fireworks imagery with diya lamps to comply with Blinkit Green Diwali guideline, and remove the unverified claim."
                      className={`w-full p-2.5 border-2 border-black font-mono text-xs ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"} focus:outline-none`}
                    />
                    <p className="text-[10px] font-mono text-[#666] dark:text-[#999] mt-1">
                      The creator will immediately see this note in their Creator Dashboard under "Why Judge Rejected This Submission".
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black">
                    <button
                      type="button"
                      onClick={() => setRejectingSub(null)}
                      className="px-3 py-1.5 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRejection}
                      disabled={isSubmittingReject}
                      className="px-4 py-1.5 border-2 border-black bg-[var(--red)] text-white text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
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
          <section className={`mb-6 relative w-full h-[290px] sm:h-[330px] lg:h-[360px] overflow-hidden border-4 ${
            isDark ? "border-[#383a45] bg-[#141518] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
          } select-none`}>
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
                overlayColor={isDark ? "#121316" : "#f5f0e7"}
              />
              <div
                className={`absolute inset-y-0 left-0 w-32 pointer-events-none bg-gradient-to-r ${
                  isDark
                    ? "from-[#141518] via-[#141518]/60 to-transparent"
                    : "from-[var(--white)] via-[var(--white)]/60 to-transparent"
                }`}
              />
            </div>

            <div className="absolute top-0 left-0 w-full sm:w-[76%] md:w-[68%] lg:w-[62%] h-full z-10 pointer-events-auto">
              <TechText
                text="BrandLens"
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
                color={isDark ? "#f8fafc" : "#101010"}
                accentColor={isDark ? "#ffdb1f" : "#101010"}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2">
              <Link
                href="/judge"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border-3 border-black bg-[var(--yellow)] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                Launch Judge Evaluation Canvas
              </Link>
            </div>
          </section>

          {/* Top Metric KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000] flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider font-black text-[#666] dark:text-[#888]">
                  Total Submissions
                </span>
                <div className="w-8 h-8 border-2 border-black bg-[var(--blue)] text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">folder_copy</span>
                </div>
              </div>
              <div className="my-2 flex items-baseline justify-between">
                <span className="font-mono text-3xl font-black text-[var(--ink)] dark:text-white">
                  {isLoading ? "..." : totalSubmissions}
                </span>
                <span className="px-2 py-0.5 border border-black bg-[var(--blue)] text-black font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                  {totalSubmissions > 0 ? "Audited Assets" : "No Audits"}
                </span>
              </div>
              <div className="pt-2 border-t-2 border-black/20 text-[10px] font-mono text-[#666] dark:text-[#888]">
                <span>Assets ingested for brand governance</span>
              </div>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000] flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider font-black text-[#666] dark:text-[#888]">
                  Compliance Score
                </span>
                <div className="w-8 h-8 border-2 border-black bg-[var(--green)] text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
              </div>
              <div className="my-2 flex items-baseline justify-between">
                <span className="font-mono text-3xl font-black text-[var(--ink)] dark:text-[#b9f4a8]">
                  {isLoading ? "..." : `${Math.round(avgComplianceScore) || 92}%`}
                </span>
                <span className="px-2 py-0.5 border border-black bg-[var(--green)] text-black font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                  Target: 90%
                </span>
              </div>
              <div className="pt-2 border-t-2 border-black/20 text-[10px] font-mono text-[#666] dark:text-[#888]">
                <span>Average across active policies</span>
              </div>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000] flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider font-black text-[#666] dark:text-[#888]">
                  Open Violations
                </span>
                <div className="w-8 h-8 border-2 border-black bg-[var(--red)] text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">report_problem</span>
                </div>
              </div>
              <div className="my-2 flex items-baseline justify-between">
                <span className="font-mono text-3xl font-black text-[var(--red)] dark:text-[#ff7b72]">
                  {isLoading ? "..." : openFindingsCount}
                </span>
                <span className="px-2 py-0.5 border border-black bg-[var(--red)] text-white font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                  {openFindingsCount > 0 ? "Review Required" : "All Clear"}
                </span>
              </div>
              <div className="pt-2 border-t-2 border-black/20 text-[10px] font-mono text-[#666] dark:text-[#888]">
                <span>Unresolved compliance findings</span>
              </div>
            </div>

            <div className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"} shadow-[4px_4px_0px_#000] flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider font-black text-[#666] dark:text-[#888]">
                  Active Guidelines
                </span>
                <div className="w-8 h-8 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">book</span>
                </div>
              </div>
              <div className="my-2 flex items-baseline justify-between">
                <span className="font-mono text-3xl font-black text-[var(--ink)] dark:text-white">
                  {analytics?.active_guidelines_count || 12}
                </span>
                <span className="px-2 py-0.5 border border-black bg-[var(--yellow)] text-black font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                  Vector Chunks
                </span>
              </div>
              <div className="pt-2 border-t-2 border-black/20 text-[10px] font-mono text-[#666] dark:text-[#888]">
                <span>Indexed in pgvector RAG index</span>
              </div>
            </div>
          </div>

          {/* Platform Admin View Selector: Our Clients | Submissions | Future Pipeline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAdminTab("clients")}
                className={`px-3.5 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === "clients"
                    ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                    : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">corporate_fare</span>
                Our Clients ({brands.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("submissions")}
                className={`px-3.5 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === "submissions"
                    ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                    : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">rule_folder</span>
                Client Submissions ({submissions.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("pipeline")}
                className={`px-3.5 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === "pipeline"
                    ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                    : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">rocket_launch</span>
                Future Pipeline (5)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/setup"
                className="px-3.5 py-2 border-2 border-black bg-[var(--yellow)] text-black text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
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
                      className={`p-4 sm:p-5 border-3 border-black transition-all flex flex-col justify-between ${
                        isCurrentActive
                          ? "bg-[var(--yellow)]/15 shadow-[4px_4px_0px_#000]"
                          : isDark
                          ? "bg-[#1c1d22] shadow-[3px_3px_0px_#000]"
                          : "bg-[var(--white)] shadow-[3px_3px_0px_#000]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 border-2 border-black bg-[var(--yellow)] text-black font-mono font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_#000]">
                              {b.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-mono font-black text-sm text-[var(--ink)] dark:text-white uppercase leading-tight">{b.name}</h4>
                              <span className="text-[10px] font-mono text-[#666] dark:text-[#999] uppercase">{b.industry || "Enterprise Brand"}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 border border-black text-[9px] font-mono font-black uppercase shadow-[1px_1px_0px_#000] ${
                              isCurrentActive
                                ? "bg-[var(--green)] text-black"
                                : "bg-white dark:bg-[#121316] text-[#666] dark:text-[#999]"
                            }`}
                          >
                            {isCurrentActive ? "● Active Tenant" : "Configured"}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] line-clamp-2 mb-4 leading-relaxed">
                          {b.tone_persona || "Autonomous brand governance guidelines and multi-modal compliance configured."}
                        </p>

                        {/* Palette swatches */}
                        {b.approved_hex_palette && b.approved_hex_palette.length > 0 && (
                          <div className="mb-4">
                            <span className="text-[9px] uppercase font-mono font-black text-[#666] dark:text-[#888] block mb-1">
                              Approved Colors
                            </span>
                            <div className="flex items-center gap-1.5">
                              {b.approved_hex_palette.slice(0, 5).map((color, idx) => (
                                <div
                                  key={idx}
                                  className="w-5 h-5 border border-black shadow-[1px_1px_0px_#000]"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Client Metric Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-black/20 text-xs mb-4">
                          <div>
                            <span className="text-[9px] uppercase font-mono font-black text-[#666] dark:text-[#888] block">Submissions</span>
                            <span className="font-mono font-black text-[var(--ink)] dark:text-white">{clientSubs.length} Audited</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-mono font-black text-[#666] dark:text-[#888] block">Policy Chunks</span>
                            <span className="font-mono font-black text-[var(--ink)] dark:text-white">110 Indexed</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t-2 border-black/20">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBrandId(b.id);
                            setAdminTab("submissions");
                          }}
                          className={`w-full py-2 border-2 border-black text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer ${
                            isCurrentActive
                              ? "bg-[var(--yellow)] text-black"
                              : "bg-white dark:bg-[#121316] text-black dark:text-white"
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
                  className={`p-6 border-3 border-dashed border-black flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-[3px_3px_0px_#000] ${
                    isDark ? "bg-[#18191f] hover:bg-[#1c1d22]" : "bg-[var(--white)] hover:bg-white"
                  }`}
                >
                  <div className="w-12 h-12 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center mb-3 shadow-[2px_2px_0px_#000]">
                    <span className="material-symbols-outlined text-[28px]">add_business</span>
                  </div>
                  <h4 className="font-mono font-black text-sm uppercase text-[var(--ink)] dark:text-white mb-1">Onboard New Client</h4>
                  <p className="text-xs font-mono text-[#666] dark:text-[#a0a5b5] max-w-xs mb-3 leading-relaxed">
                    Ingest brand guidelines, configure color palettes, extract policy rules and launch an autonomous tenant workspace.
                  </p>
                  <span className="text-xs font-mono font-black uppercase underline text-[var(--ink)] dark:text-white">
                    Launch Client Wizard →
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
                  className={`lg:col-span-8 p-5 border-4 ${
                    isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <div>
                      <h3 className="font-archivo font-black text-sm uppercase tracking-tight text-[var(--ink)] dark:text-white">
                        Compliance Score Progression
                      </h3>
                      <p className="font-mono text-xs text-[#666] dark:text-[#999]">
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
                              <stop offset="5%" stopColor={isDark ? "#ffdb1f" : "#ffdb1f"} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={isDark ? "#ffdb1f" : "#ffdb1f"} stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#383a45" : "#e2e8f0"} />
                          <XAxis dataKey="run" stroke={isDark ? "#9ca3af" : "#111827"} fontSize={11} fontFamily="monospace" />
                          <YAxis domain={[50, 100]} stroke={isDark ? "#9ca3af" : "#111827"} fontSize={11} fontFamily="monospace" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? "#1c1d22" : "#ffffff",
                              borderColor: "#000000",
                              borderWidth: "2px",
                              boxShadow: "3px 3px 0px #000",
                              borderRadius: "0px",
                              fontFamily: "monospace",
                              fontSize: "11px",
                            }}
                          />
                          <ReferenceLine y={90} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: "TARGET (90%)", fill: "#10b981", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} />
                          <Area type="monotone" dataKey="compliance" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#complianceGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs font-mono text-[#666]">Loading chart...</div>
                    )}
                  </div>
                </div>

                {/* Top Violations Breakdown */}
                <div
                  className={`lg:col-span-4 p-5 border-4 ${
                    isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <h3 className="font-archivo font-black text-sm uppercase tracking-tight text-[var(--ink)] dark:text-white">
                      Top Violations
                    </h3>
                    <span className="text-[10px] font-mono font-black uppercase text-[#666] dark:text-[#999]">{totalCategoryViolations} Total</span>
                  </div>

                  <div className="space-y-3.5">
                    {categoryEntries.length === 0 ? (
                      <p className="text-xs font-mono text-[#666] py-6 text-center">No violations logged for this brand.</p>
                    ) : (
                      categoryEntries.slice(0, 4).map(([cat, count]) => {
                        const pct = Math.round((count / totalCategoryViolations) * 100);
                        return (
                          <div key={cat} className="space-y-1 font-mono">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="uppercase text-[var(--ink)] dark:text-white">{cat.replace("_", " ")}</span>
                              <span className="font-black text-[#666] dark:text-[#a0a5b5]">{pct}% ({count})</span>
                            </div>
                            <div className="w-full h-3 border-2 border-black bg-black/10 overflow-hidden">
                              <div className="h-full bg-[var(--yellow)] border-r border-black" style={{ width: `${pct}%` }} />
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
                className={`border-4 ${
                  isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
                } overflow-hidden`}
              >
                <div className="px-5 py-3.5 border-b-3 border-black flex items-center justify-between bg-[var(--ink)] text-white">
                  <div>
                    <h3 className="font-archivo font-black text-sm uppercase tracking-tight">Client Submissions Review Queue</h3>
                    <p className="text-[10px] font-mono text-[#bbb]">Direct superuser override authority — approve or reject submissions instantly</p>
                  </div>
                  <span className="text-xs font-mono font-black px-2 py-0.5 border border-white bg-black text-white">
                    {submissions.length} Total
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px] font-mono text-xs">
                    <thead>
                      <tr className="border-b-2 border-black bg-black/10 dark:bg-white/10 uppercase text-[10px] font-black tracking-wider">
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Author / Format</th>
                        <th className="py-3 px-4">Findings</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black">
                      {topSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[var(--ink)] dark:text-white uppercase">{sub.title}</div>
                            <div className="text-[10px] text-[#666] dark:text-[#999]">SUB-#{sub.id} · v{sub.current_version}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[var(--ink)] dark:text-white">{sub.creator_name}</div>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 border border-black bg-[var(--yellow)] text-black">{sub.content_format}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#666] dark:text-[#a0a5b5]">
                              {sub.findings?.length || 0} Flags
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black">
                            {sub.compliance_score != null ? `${sub.compliance_score}%` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 border border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_#000] bg-[var(--yellow)] text-black">
                              {sub.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(sub.id, "APPROVED")}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--green)] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                              >
                                ✓ Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(sub.id, "CHANGES_REQUESTED")}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-[var(--red)] text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                              >
                                ✕ Reject
                              </button>
                              <Link
                                href={`/audit?id=${sub.id}`}
                                className="px-2.5 py-1 border-2 border-black text-[10px] font-black uppercase bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
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
              <div className={`p-5 border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-archivo font-black text-base uppercase text-[var(--ink)] dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                      Enterprise Expansion Pipeline
                    </h3>
                    <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] mt-1 max-w-xl leading-relaxed">
                      Future prospective brands pre-analyzed for autonomous brand governance. Platform admins can provision an instant isolated workspace with one click.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-black uppercase px-3 py-1 border-2 border-black bg-[var(--pink)] text-black shadow-[2px_2px_0px_#000] self-start sm:self-auto">
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
                      className={`p-4 sm:p-5 border-3 border-black transition-all flex flex-col justify-between ${
                        isDark ? "bg-[#1c1d22] shadow-[3px_3px_0px_#000]" : "bg-[var(--white)] shadow-[3px_3px_0px_#000]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div>
                            <h4 className="font-mono font-black text-base uppercase text-[var(--ink)] dark:text-white leading-tight">{client.name}</h4>
                            <span className="text-[10px] font-mono text-[#666] dark:text-[#999] uppercase">{client.industry}</span>
                          </div>
                          <span className="px-2 py-0.5 border border-black text-[10px] font-mono font-black uppercase bg-[var(--pink)] text-black shadow-[1px_1px_0px_#000]">
                            {client.fitScore}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-3">
                          {client.description}
                        </p>

                        {/* Tone & Palette */}
                        <div className="space-y-2 mb-4 text-xs font-mono">
                          <div>
                            <span className="text-[9px] uppercase font-black text-[#666] dark:text-[#888] block">
                              Target Tone &amp; Persona
                            </span>
                            <span className="text-xs text-[var(--ink)] dark:text-white line-clamp-1">{client.tone}</span>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-black text-[#666] dark:text-[#888] block mb-1">
                              Proposed Palette
                            </span>
                            <div className="flex items-center gap-1.5">
                              {client.palette.map((hex, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-4 border border-black shadow-[1px_1px_0px_#000]"
                                  style={{ backgroundColor: hex }}
                                  title={hex}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t-2 border-black/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#666] dark:text-[#888]">Pipeline Stage:</span>
                            <span className="text-[10px] font-black text-[var(--ink)] dark:text-white uppercase">{client.pipelineStatus}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t-2 border-black/20">
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
                            className="w-full py-2 border-2 border-black text-xs font-mono font-black uppercase bg-[var(--green)] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                          >
                            ✓ Workspace Live (Switch)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleProvisionProspect(client)}
                            disabled={isProcessing}
                            className="w-full py-2 border-2 border-black text-xs font-mono font-black uppercase bg-[var(--yellow)] text-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
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
          {/* Confirmation Modal for Reset Database */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md border-4 border-black bg-white dark:bg-[#1c1d22] p-6 shadow-[8px_8px_0px_#000] font-mono text-left space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-[var(--red)] border-b-2 border-black pb-2">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-archivo font-black text-base uppercase text-[var(--red)] dark:text-[#ff7b72]">
                Purge &amp; Reset Database?
              </h3>
            </div>
            <p className="text-xs text-[#333] dark:text-[#ccc] leading-relaxed">
              This action will permanently delete <strong>all submissions, revisions, and audit findings</strong> across the platform, and restore a pristine, clean Blinkit default brand pack and demo user accounts.
            </p>
            <div className="p-3 border-2 border-black bg-[var(--yellow)]/20 text-[11px] font-bold text-black dark:text-white">
              ⚠️ You can safely log in fresh and test clean end-to-end poster audits afterwards.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResettingDb}
                className="px-4 py-2 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={isResettingDb}
                className="px-4 py-2 border-2 border-black bg-[var(--red)] hover:bg-[#ff3333] text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${isResettingDb ? "animate-spin" : ""}`}>
                  {isResettingDb ? "sync" : "delete_forever"}
                </span>
                {isResettingDb ? "Wiping..." : "Yes, Purge Database"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Toast */}
      {resetSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 border-3 border-black bg-[var(--green)] text-black font-mono font-black text-xs uppercase shadow-[4px_4px_0px_#000] flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{resetSuccessToast}</span>
        </div>
      )}

    </div>
  );
}
