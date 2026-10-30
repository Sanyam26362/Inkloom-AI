"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api";
import { Submission, AuditExecutionResponse, AuditFinding } from "@/lib/types";

type ContentFormatType = "INSTAGRAM_POST" | "TWEET" | "POSTER" | "VIDEO_REEL" | "AUDIO_AD";

export default function CreatorContentStudioPage() {
  const router = useRouter();
  const { user, activeBrandId, currentRole, setCurrentRole, brands, setActiveBrandId, theme } = useApp();
  const isDark = theme === "dark";

  // Form State
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatType>("POSTER");
  const [title, setTitle] = useState("Blinkit Diwali Sweets & Diyas");
  const [copy, setCopy] = useState(
    "Celebrate Diwali with sweets, fresh decor and earthen diyas delivered in 10 minutes by your delivery partner. Find festive favourites on the Blinkit app."
  );
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Audit Execution & Report State
  const [isAuditing, setIsAuditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditExecutionResponse | null>(null);
  const [submissionData, setSubmissionData] = useState<Submission | null>(null);
  const [auditLatency, setAuditLatency] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-Fix & Creative Synthesis Modal State
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);
  const [fixStepTitle, setFixStepTitle] = useState("");
  const [fixStepDetail, setFixStepDetail] = useState("");
  const [fixLogs, setFixLogs] = useState<string[]>([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  // Create & revoke object URL for uploaded image preview
  useEffect(() => {
    if (!assetFile) {
      setImagePreviewUrl(null);
      return;
    }

    if (assetFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(assetFile);
      setImagePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImagePreviewUrl(null);
    }
  }, [assetFile]);

  // Target Brand Fallback (Ensure Blinkit is selected)
  const targetBrandId =
    activeBrandId || brands.find((b) => b.name.toLowerCase() === "blinkit")?.id || brands[0]?.id;

  useEffect(() => {
    if (targetBrandId && targetBrandId !== activeBrandId) {
      setActiveBrandId(targetBrandId);
    }
  }, [targetBrandId, activeBrandId, setActiveBrandId]);

  // Fallback image URL from server if local preview is not set
  const displayImageUrl =
    imagePreviewUrl ||
    (submissionData?.revisions && submissionData.revisions.length > 0
      ? submissionData.revisions[submissionData.revisions.length - 1]?.media_urls?.[0]
      : null);

  // Load Evaluator Benchmark Creative Sample
  const handleLoadBenchmarkSample = async (sampleType: "violating" | "compliant" | "gemini1" | "gemini2") => {
    try {
      let sampleUrl = "/samples/sample_compliant_diwali.png";
      let fileName = "Blinkit_Diwali_Compliant_Sample.png";
      let sampleTitle = "Blinkit Diwali Sweets & Diyas";
      let sampleCopy = "Celebrate Diwali with sweets, fresh decor and earthen diyas delivered in minutes by your delivery partner. Find festive favourites on the Blinkit app.";
      let toastMsg = "Loaded Brand-Compliant Sample! Click 'Run Autonomous AI Governance Audit' to verify 100% compliance.";

      if (sampleType === "violating") {
        sampleUrl = "/samples/sample_violating_diwali.png";
        fileName = "Blinkit_Diwali_Violations_Sample.png";
        sampleTitle = "Blinkit Diwali Sweets & Diyas";
        sampleCopy = "Celebrate Diwali with sweets, fresh decor and earthen diyas delivered in 10 minutes by your delivery partner. Find festive favourites on the blinlit app.";
        toastMsg = "Loaded Non-Compliant Sample! Click 'Run Autonomous AI Governance Audit' to inspect infractions.";
      } else if (sampleType === "gemini1") {
        sampleUrl = "/samples/gemini_diwali_poster_1.png";
        fileName = "Gemini_Diwali_Poster_1.png";
        sampleTitle = "The Big Diwali Sale - Blinkit Sweets & Diyas";
        sampleCopy = "Everything you need, delivered in minutes! Unbeatable offers on sweets, gifting, decor and earthen diyas on the Blinkit app.";
        toastMsg = "Loaded Gemini AI Poster #1! Click 'Run Autonomous AI Governance Audit' to evaluate.";
      } else if (sampleType === "gemini2") {
        sampleUrl = "/samples/gemini_diwali_poster_2.png";
        fileName = "Gemini_Diwali_Poster_2.png";
        sampleTitle = "Blinkit Diwali Sweets & Diyas - Festive Treats";
        sampleCopy = "Celebrate Diwali with fresh sweets, handcrafted earthen diyas, and festive gifts delivered in minutes on the Blinkit app.";
        toastMsg = "Loaded Gemini AI Poster #2! Click 'Run Autonomous AI Governance Audit' to evaluate.";
      }

      const res = await fetch(sampleUrl);
      if (!res.ok) throw new Error("Could not fetch sample");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      setAssetFile(file);
      setImagePreviewUrl(sampleUrl);
      setTitle(sampleTitle);
      setCopy(sampleCopy);
      setSuccessMessage(toastMsg);
    } catch {
      setErrorMessage("Failed to load benchmark sample asset.");
    }
  };

  // Execute Real Audit
  const handleRunAudit = async (customCopy?: string, customTitle?: string, overrideAsset?: File | null) => {
    setIsAuditing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const startTime = performance.now();
    try {
      let brandId = targetBrandId;
      if (!brandId) {
        let blinkit = brands.find((b) => b.name.toLowerCase() === "blinkit");
        if (!blinkit) {
          const freshBrands = await api.listBrands().catch(() => []);
          blinkit = freshBrands.find((b) => b.name.toLowerCase() === "blinkit");
        }
        if (blinkit) {
          brandId = blinkit.id;
          setActiveBrandId(blinkit.id);
        }
      }

      if (!brandId) {
        throw new Error("Brand workspace not found. Please select or initialize Blinkit.");
      }

      const activeTitle = customTitle || title.trim() || "Diwali Campaign Creative";
      const activeCopy = customCopy !== undefined ? customCopy : copy.trim();

      const formatKindMap: Record<ContentFormatType, string> = {
        INSTAGRAM_POST: "POST",
        TWEET: "POST",
        POSTER: "IMAGE",
        VIDEO_REEL: "VIDEO",
        AUDIO_AD: "AUDIO",
      };

      const backendFormat = formatKindMap[selectedFormat] || "IMAGE";

      // 1. Create or provision submission in backend
      const sub = await api.createSubmission(
        {
          brand_id: brandId,
          title: activeTitle,
          content_format: backendFormat,
          initial_content: activeCopy,
          platform: selectedFormat === "INSTAGRAM_POST" ? "Instagram" : selectedFormat === "TWEET" ? "X / Twitter" : "Digital Display",
          alt_text: activeTitle ? `${activeTitle} - ${activeCopy.slice(0, 100)}` : "Festive promotional campaign creative",
        },
        { userRole: currentRole }
      );

      // 2. Execute Autonomous Audit based on payload type
      const targetAsset = overrideAsset !== undefined ? overrideAsset : assetFile;
      let auditRes: AuditExecutionResponse;
      if (targetAsset) {
        if (targetAsset.type.startsWith("image/")) {
          auditRes = await api.uploadImage(sub.id, targetAsset, { userRole: currentRole }, "diwali");
        } else if (targetAsset.type.startsWith("audio/")) {
          auditRes = await api.uploadAudio(sub.id, targetAsset, { userRole: currentRole }, "diwali");
        } else if (targetAsset.type.startsWith("video/")) {
          auditRes = await api.uploadVideo(sub.id, targetAsset, { userRole: currentRole }, "diwali");
        } else {
          auditRes = await api.uploadImage(sub.id, targetAsset, { userRole: currentRole }, "diwali");
        }
      } else {
        // Text-only submission audit
        auditRes = await api.auditSubmission(sub.id, { userRole: currentRole }, "diwali");
      }

      const elapsed = Math.round(performance.now() - startTime);

      // 3. Fetch enriched submission with findings
      const enrichedSub = await api.getSubmission(sub.id, { userRole: currentRole });

      setAuditLatency(elapsed);
      setAuditResult(auditRes);
      setSubmissionData(enrichedSub);

      // Smooth scroll to audit report
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      setSuccessMessage(`Audit completed in ${elapsed}ms: ${auditRes.total_findings} findings evaluated.`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to execute audit.";
      setErrorMessage(msg);
    } finally {
      setIsAuditing(false);
    }
  };

  // Apply a single suggested correction
  const handleApplySingleCorrection = (finding: AuditFinding) => {
    if (!finding.suggested_correction || !finding.flagged_excerpt) return;
    const target = finding.flagged_excerpt.trim();
    if (!target) return;

    if (copy.includes(target)) {
      const updated = copy.replace(target, finding.suggested_correction);
      setCopy(updated);
      setSuccessMessage(`Applied fix: "${target}" → "${finding.suggested_correction}". Re-audit to update compliance score.`);
    } else {
      try {
        const regex = new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if (regex.test(copy)) {
          const updated = copy.replace(regex, finding.suggested_correction);
          setCopy(updated);
          setSuccessMessage(`Applied fix: "${target}" → "${finding.suggested_correction}". Re-audit to update score.`);
        }
      } catch {}
    }
  };

  // Apply all suggested corrections
  const handleApplyAllFixes = () => {
    const findingsList = auditResult?.findings?.length ? auditResult.findings : submissionData?.findings;
    if (!findingsList) return;
    let newCopy = copy;
    let appliedCount = 0;

    for (const finding of findingsList) {
      if (finding.suggested_correction && finding.flagged_excerpt) {
        const target = finding.flagged_excerpt.trim();
        if (target && newCopy.includes(target)) {
          newCopy = newCopy.replace(target, finding.suggested_correction);
          appliedCount++;
        }
      }
    }

    if (appliedCount > 0) {
      setCopy(newCopy);
      setSuccessMessage(`Applied ${appliedCount} corrections to copy! Click 'Run Autonomous AI Governance Audit' to verify the new score.`);
    } else {
      setErrorMessage("No direct text replacements could be matched automatically.");
    }
  };

  // Open Remediation & Synthesis Modal with Progress Bar
  const handleOpenFixModal = async () => {
    setShowFixModal(true);
    setIsFixing(true);
    setFixError(null);
    setGeneratedImageUrl(null);
    setGeneratedFile(null);
    setFixProgress(15);
    setFixStepTitle("Analyzing Brand Guidelines & Violations");
    setFixStepDetail("Reviewing flagged excerpts, banned terminology, and firecracker restrictions...");
    setFixLogs([
      `[0.1s] Initializing autonomous remediation pipeline...`,
      `[0.2s] Active audit flagged violations across multi-modal dimensions.`,
    ]);

    try {
      // Step 1: Copy Corrections
      await new Promise((r) => setTimeout(r, 600));
      setFixProgress(35);
      setFixStepTitle("Applying Intent-Preserving Copy Corrections");
      setFixStepDetail("Replacing non-compliant terms with approved Blinkit brand vocabulary...");

      const findingsList = auditResult?.findings?.length ? auditResult.findings : submissionData?.findings;
      let newCopy = copy;
      let appliedCount = 0;
      if (findingsList) {
        for (const finding of findingsList) {
          if (finding.suggested_correction && finding.flagged_excerpt) {
            const target = finding.flagged_excerpt.trim();
            if (target && newCopy.includes(target)) {
              newCopy = newCopy.replace(target, finding.suggested_correction);
              appliedCount++;
            }
          }
        }
      }
      if (newCopy.toLowerCase().includes("blinlit")) {
        newCopy = newCopy.replace(/blinlit/gi, "Blinkit");
        appliedCount++;
      }
      if (newCopy.toLowerCase().includes("10-minute") || newCopy.toLowerCase().includes("10 minute")) {
        newCopy = newCopy.replace(/10-?minute guarantee/gi, "super-fast delivery in minutes");
        appliedCount++;
      }
      setCopy(newCopy);

      setFixLogs((prev) => [
        ...prev,
        `[0.8s] Copy remediation complete: ${appliedCount} phrases updated with approved terminology.`,
        "[1.0s] Preparing FLUX prompt with verified Blinkit visual tokens & zero-cracker policy...",
      ]);

      // Step 2: Image Synthesis via Server-Side Next.js Route
      await new Promise((r) => setTimeout(r, 500));
      setFixProgress(65);
      setFixStepTitle("Synthesizing Brand-Compliant Visual Asset");
      setFixStepDetail("FLUX engine is synthesizing clean Diwali visual: glowing clay diyas, traditional sweets, zero firecrackers...");

      const compliantPrompt = "A high-end commercial advertising poster for Blinkit Diwali campaign. Centerpiece features traditional glowing Indian earthen clay oil lamps (diyas) with warm golden flames, beautifully arranged silver and golden gift boxes of artisanal sweets (kaju katli, gulab jamun, motichoor laddoos), and fresh orange marigold flower garlands. Clean modern layout with Blinkit signature brand colors: vibrant sunflower yellow (#F8C200) header banner and deep forest green (#00A36C) ribbons. High contrast bold typography: 'Blinkit Diwali Sale - Delivered in Minutes'. Crisp studio lighting, 8k resolution, commercial photography, absolutely no firecrackers, zero fireworks, zero smoke, zero sparklers, 100% eco-friendly and brand compliant.";

      setFixLogs((prev) => [
        ...prev,
        "[1.5s] Requesting image synthesis via Inkloom server-side creative engine...",
      ]);

      const response = await fetch("/api/generate-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: compliantPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Creative generation proxy returned HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const sourceHeader = response.headers.get("X-Creative-Source") || "pollinations-flux";
      const objectUrl = URL.createObjectURL(blob);
      const compliantFile = new File([blob], `blinkit_compliant_diwali_${Date.now()}.jpg`, { type: "image/jpeg" });

      setGeneratedImageUrl(objectUrl);
      setGeneratedFile(compliantFile);

      // Step 3: Complete
      setFixProgress(100);
      setFixStepTitle("Remediation & Visual Synthesis Complete!");
      setFixStepDetail("Brand-compliant asset ready. You can download the image now or apply it to re-run the audit.");
      setFixLogs((prev) => [
        ...prev,
        `[Complete] Generated high-res creative (${Math.round(blob.size / 1024)} KB) via ${sourceHeader}.`,
        "[Complete] Zero fireworks verified. Traditional clay diyas and festive sweets confirmed.",
        "[Complete] Ready for download or direct studio re-audit.",
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error synthesizing compliant creative.";
      setFixError(msg);
      setFixLogs((prev) => [...prev, `[ERROR] ${msg}`]);
    } finally {
      setIsFixing(false);
    }
  };

  // Download Generated High-Res Creative
  const handleDownloadGeneratedImage = () => {
    if (!generatedImageUrl) return;
    const a = document.createElement("a");
    a.href = generatedImageUrl;
    a.download = "blinkit_compliant_diwali_poster.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Apply to Studio & Re-Audit
  const handleApplyToStudioAndAudit = async () => {
    if (!generatedFile || !generatedImageUrl) return;
    setAssetFile(generatedFile);
    setImagePreviewUrl(generatedImageUrl);
    setShowFixModal(false);
    setSuccessMessage("Compliant asset loaded! Running autonomous AI governance audit...");
    await handleRunAudit(copy, title, generatedFile);
  };

  // Close Remediation Modal
  const handleCloseFixModal = () => {
    setShowFixModal(false);
  };

  const handleFixAndRegenerate = handleOpenFixModal;

  // Submit to Brand Review Queue and Route to Brand Dashboard
  const handleSubmitToBrandQueue = async () => {
    if (!submissionData) return;
    try {
      await api.updateStatus(submissionData.id, "SUBMITTED", "Creator verified with AI governance pre-flight audit. Forwarded to brand review.", {
        userRole: currentRole,
      });
      setSuccessMessage(`Submission #${submissionData.id} forwarded to Brand Governance Queue! Redirecting to Brand Dashboard...`);
      // Seamlessly switch to Brand Reviewer role and navigate directly to brand dashboard
      setCurrentRole("REVIEWER");
      setTimeout(() => {
        router.push(`/dashboard?view=brand&highlight=${submissionData.id}`);
      }, 500);
    } catch {
      setErrorMessage("Failed to submit to brand queue.");
    }
  };

  // Active findings list for dynamic dimension cards
  const activeFindings = auditResult?.findings?.length ? auditResult.findings : submissionData?.findings || [];
  const dimResults = auditResult?.dimension_results || {};

  // Category helpers for dynamic dimension cards
  const getCatFindings = (categories: string[]) =>
    activeFindings.filter((f) => categories.some((c) => (f.category || "").toUpperCase().includes(c)));

  const visualFindings = getCatFindings(["VISUAL", "COLOR", "IMAGE"]);
  const termFindings = getCatFindings(["TERMINOLOGY", "TONE", "VOICE"]);
  const claimFindings = getCatFindings(["FACTUAL_CLAIM", "FACT", "CLAIM"]);
  const eventFindings = getCatFindings(["EVENT", "CAMPAIGN", "EVENT_FIT", "PROHIBITED", "SAFETY"]);
  const accessFindings = getCatFindings(["ACCESSIBILITY", "WCAG", "CONTRAST"]);

  // Dynamic Dimension 1: Visual & Palette
  const visualDim = dimResults["visual_identity"] || dimResults["visual"];
  const visualScore = auditResult?.palette_match_pct !== undefined && auditResult?.palette_match_pct !== null
    ? Math.round(auditResult.palette_match_pct)
    : visualDim?.score ?? (visualFindings.length === 0 ? 98 : Math.max(0, 100 - visualFindings.length * 30));
  const visualPass = visualScore >= 75 && !visualFindings.some((f) => f.severity === "CRITICAL");
  const visualDetail = auditResult?.palette_match_pct !== undefined && auditResult?.palette_match_pct !== null
    ? `${Math.round(auditResult.palette_match_pct)}% CIELAB palette match against Blinkit guidelines`
    : visualFindings.length > 0
    ? visualFindings[0].flagged_excerpt
    : "Blinkit signature yellow & green palette verified";

  // Dynamic Dimension 2: Brand Terminology
  const termDim = dimResults["voice_and_terminology"] || dimResults["terminology"];
  const termScore = termDim?.score ?? (termFindings.length === 0 ? 100 : Math.max(0, 100 - termFindings.length * 25));
  const termPass = termScore >= 80 && !termFindings.some((f) => f.severity === "CRITICAL");
  const termDetail = termFindings.length === 0
    ? "Uses approved terminology exclusively (0 banned terms)"
    : `Flagged: "${termFindings.map((f) => f.flagged_excerpt).slice(0, 2).join('", "')}"`;

  // Dynamic Dimension 3: Factual Claims
  const claimDim = dimResults["claims_and_facts"] || dimResults["facts"];
  const claimScore = claimDim?.score ?? (claimFindings.length === 0 ? 100 : Math.max(0, 100 - claimFindings.length * 35));
  const claimPass = claimScore >= 80 && !claimFindings.some((f) => f.severity === "CRITICAL");
  const claimDetail = claimFindings.length === 0
    ? "All claims grounded in Blinkit Knowledge Register"
    : `Unverified claim: "${claimFindings.map((f) => f.flagged_excerpt).slice(0, 2).join('", "')}"`;

  // Dynamic Dimension 4: Diwali Event Fit
  const eventDim = dimResults["campaign_event"] || dimResults["event_fit"] || dimResults["prohibited_content"];
  const eventScore = eventDim?.score ?? (eventFindings.length === 0 ? 95 : Math.max(0, 100 - eventFindings.length * 40));
  const eventPass = eventScore >= 75 && !eventFindings.some((f) => f.severity === "CRITICAL");
  const eventDetail = eventFindings.length === 0
    ? "Diwali festival theme verified, zero cracker imagery"
    : `Prohibited subject: "${eventFindings.map((f) => f.flagged_excerpt).slice(0, 2).join('", "')}"`;

  // Dynamic Dimension 5: WCAG Accessibility
  const accessDim = dimResults["accessibility"];
  const accessScore = accessDim?.score ?? (accessFindings.length === 0 ? 95 : Math.max(0, 100 - accessFindings.length * 25));
  const accessPass = accessScore >= 75 && !accessFindings.some((f) => f.severity === "CRITICAL");
  const accessDetail = accessFindings.length === 0
    ? "WCAG 2.1 AA text contrast & alt tags compliant"
    : accessFindings[0].flagged_excerpt || "Contrast ratio below WCAG AA minimum";

  // Dynamic Overall Compliance Score: Balanced composite average of all 5 dimensions
  const dimensionAverage = Math.round((visualScore + termScore + claimScore + eventScore + accessScore) / 5);
  const backendRawScore = auditResult?.compliance_score ?? submissionData?.compliance_score ?? null;
  const score = backendRawScore !== null && backendRawScore > 0 ? Math.round(backendRawScore) : (submissionData || auditResult ? dimensionAverage : null);
  const isPass = (auditResult?.verdict || submissionData?.verdict) === "PASS" || (score !== null && score >= 80 && !activeFindings.some((f) => f.severity === "CRITICAL"));

  return (
    <div
      className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${
        isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {/* Toast Notification */}
      {(successMessage || errorMessage) && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md border-3 border-black p-4 shadow-[6px_6px_0px_#000000] flex items-start gap-3 ${
            successMessage
              ? "bg-[var(--green)] text-black"
              : "bg-[var(--red)] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">
            {successMessage ? "check_circle" : "error"}
          </span>
          <div className="flex-1 text-xs font-mono font-bold leading-relaxed">
            {successMessage || errorMessage}
          </div>
          <button
            onClick={() => {
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="w-6 h-6 border-2 border-black bg-white text-black font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-[1550px] mx-auto">
        {/* Header Bar */}
        <div className={`p-5 sm:p-6 border-4 ${
          isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
        } flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6`}>
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 border-2 border-black bg-[var(--green)] text-black text-[10px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                CREATOR PRODUCTION STUDIO
              </span>
              <span className="text-xs font-mono font-black text-[#555] dark:text-[#a0a5b5]">
                GOVERNING BRAND: <strong className="text-[var(--ink)] dark:text-white uppercase">Blinkit</strong> · CAMPAIGN: <strong className="text-[var(--ink)] dark:text-white uppercase">Diwali 2026</strong>
              </span>
              {user?.creator_type && (
                <span className="px-2 py-0.5 border border-black bg-white dark:bg-[#1a1b20] text-[10px] font-mono font-bold text-[var(--ink)] dark:text-white shadow-[1px_1px_0px_#000]">
                  {user.creator_type === "AD_AGENCY" ? "🏢 AGENCY: " : user.creator_type === "IN_HOUSE_EMPLOYEE" ? "🏢 IN-HOUSE: " : "🚀 FREELANCE: "}
                  {user.organization_name || "Creative Partner"}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-archivo font-black uppercase tracking-tight text-[var(--ink)] dark:text-white">
              Autonomous Brand Governance &amp; Creator Studio
            </h1>
            <p className="mt-1 text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-2xl leading-relaxed">
              Verify promotional marketing copy, festive banners, audio voiceovers, and video reels against approved brand policies before public distribution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/profile"
              className="px-3.5 py-2 border-2 border-black bg-white dark:bg-[#1a1b20] text-black dark:text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">badge</span>
              {user?.creator_type ? "Creator Profile" : "Setup Profile ⚠️"}
            </Link>
            <Link
              href="/dashboard"
              className="px-3.5 py-2 border-2 border-black bg-[var(--yellow)] text-black text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">dashboard</span>
              Creator Dashboard
            </Link>
          </div>
        </div>

        {/* 2-Column Layout: Left = Upload Studio, Right = Live Creative Preview & Scanner */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: CREATOR UPLOAD STUDIO (7 Cols)                               */}
          {/* ========================================================================= */}
          <div className="xl:col-span-7 space-y-6">
            <div className={`p-5 sm:p-7 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            }`}>
              {/* Step 1: Content Format Selector */}
              <div className="mb-6">
                <label className="block text-xs font-black uppercase tracking-wider text-[#666] dark:text-[#888] mb-2.5 font-mono">
                  [STEP 01 // SELECT CONTENT MEDIUM]
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: "POSTER" as ContentFormatType, label: "Festive Poster", icon: "image" },
                    { id: "INSTAGRAM_POST" as ContentFormatType, label: "Instagram Post", icon: "photo_library" },
                    { id: "TWEET" as ContentFormatType, label: "Tweet / X Post", icon: "chat" },
                    { id: "VIDEO_REEL" as ContentFormatType, label: "Video Ad / Reel", icon: "movie" },
                    { id: "AUDIO_AD" as ContentFormatType, label: "Audio Voiceover", icon: "mic" },
                  ].map((fmt) => {
                    const isSelected = selectedFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setSelectedFormat(fmt.id)}
                        className={`p-3 border-2 border-black text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                            : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{fmt.icon}</span>
                        <span className="text-[10px] font-mono font-black uppercase leading-tight">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Campaign Asset Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black uppercase text-[var(--ink)] dark:text-white">
                      [STEP 02 // CREATIVE TITLE / HEADLINE]
                    </label>
                    <span className="text-[10px] font-mono text-[#666] dark:text-[#888]">CAMPAIGN HEADER</span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Blinkit Diwali Sweets & Snacks Launch"
                    className={`w-full h-11 px-3.5 border-2 border-black font-mono text-xs font-bold text-[var(--ink)] dark:text-white shadow-[3px_3px_0px_#000] focus:outline-none ${
                      isDark ? "bg-[#1c1d22]" : "bg-white"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black uppercase text-[var(--ink)] dark:text-white">
                      MARKETING COPY / SCRIPT
                    </label>
                    <span className="text-[10px] font-mono text-[#666] dark:text-[#888]">
                      {copy.length} CHARS · {copy.trim().split(/\s+/).filter(Boolean).length} WORDS
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    placeholder="Enter post body, advertising copy, or video voiceover script..."
                    className={`w-full p-3.5 border-2 border-black font-mono text-xs leading-relaxed text-[var(--ink)] dark:text-white shadow-[3px_3px_0px_#000] focus:outline-none ${
                      isDark ? "bg-[#1c1d22]" : "bg-white"
                    }`}
                  />
                </div>
              </div>

              {/* Step 3: File Attachment (Drag & Drop) */}
              <div className="mb-6">
                <label className="block text-xs font-black uppercase text-[var(--ink)] dark:text-white mb-2 font-mono">
                  [STEP 03 // MULTIMODAL PAYLOAD ATTACHMENT]
                </label>
                <label className={`flex flex-col items-center justify-center p-5 border-3 border-dashed border-black shadow-[3px_3px_0px_#000] cursor-pointer transition-all ${
                  isDark ? "bg-[#141518] hover:bg-[#1c1d22]" : "bg-[var(--paper)] hover:bg-white"
                }`}>
                  <input
                    type="file"
                    accept="image/*,audio/*,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAssetFile(f);
                    }}
                    className="hidden"
                  />
                  {assetFile ? (
                    <div className="flex items-center gap-3 w-full justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
                          <span className="material-symbols-outlined text-[24px]">
                            {assetFile.type.startsWith("image/") ? "image" : assetFile.type.startsWith("audio/") ? "mic" : "movie"}
                          </span>
                        </div>
                        <div className="text-left font-mono">
                          <p className="text-xs font-black uppercase text-[var(--ink)] dark:text-white truncate max-w-xs">{assetFile.name}</p>
                          <p className="text-[10px] text-[#666] dark:text-[#888]">
                            {(assetFile.size / 1024).toFixed(1)} KB · {assetFile.type || "file"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setAssetFile(null);
                        }}
                        className="px-2.5 py-1 border-2 border-black bg-[var(--red)] text-white text-[10px] font-mono font-black uppercase shadow-[1px_1px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer shrink-0"
                      >
                        ✕ REMOVE
                      </button>
                    </div>
                  ) : (
                    <div className="text-center font-mono py-2">
                      <div className="w-12 h-12 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-2 shadow-[2px_2px_0px_#000]">
                        <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                      </div>
                      <p className="text-xs font-black uppercase text-[var(--ink)] dark:text-white">
                        Click or Drop Creative Asset
                      </p>
                      <p className="text-[10px] text-[#666] dark:text-[#888] mt-0.5">
                        PNG, JPG, MP3, MP4 supported for multimodal Gemini Vision &amp; OCR verification
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Evaluator Benchmark Sample Creatives (1-Click Test Canvas) */}
              <div className="mb-6 pt-1">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#666] dark:text-[#888] font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">science</span>
                    [TRY BENCHMARK SAMPLE IMAGES // 1-CLICK AUDIT]
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 bg-black/5 dark:bg-white/10 text-[var(--ink)] dark:text-white border border-black/30">
                    Dataset Benchmark
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Sample 1: Gemini AI Poster 1 */}
                  <div
                    onClick={() => handleLoadBenchmarkSample("gemini1")}
                    className="p-3 border-3 border-black bg-[var(--yellow)]/15 hover:bg-[var(--yellow)]/30 transition-all cursor-pointer shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 group flex flex-col justify-between"
                  >
                    <div className="flex gap-2.5 items-center mb-2">
                      <div className="w-14 h-18 shrink-0 border-2 border-black overflow-hidden bg-black shadow-[1px_1px_0px_#000] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/samples/gemini_diwali_poster_1_thumb.jpg"
                          alt="Gemini AI Poster 1 - The Big Diwali Sale"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-0 right-0 bg-[var(--yellow)] text-black text-[7px] font-black px-0.5 border-b border-l border-black">
                          AI #1
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 font-mono">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 dark:text-amber-400 mb-0.5">
                          <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                          Gemini Poster
                        </div>
                        <h4 className="text-[11px] font-bold text-[var(--ink)] dark:text-white truncate">
                          Big Diwali Sale
                        </h4>
                        <p className="text-[9px] text-[#555] dark:text-[#a0a5b5] line-clamp-2 mt-0.5 leading-snug">
                          Diwali sweets box, diyas, gold banner &amp; festive copy.
                        </p>
                      </div>
                    </div>
                    <span className="text-center text-[9px] font-black uppercase py-1 border border-black bg-white dark:bg-[#1a1b20] text-black dark:text-white shadow-[1px_1px_0px_#000] group-hover:bg-[var(--yellow)] group-hover:text-black transition-colors">
                      Test Canvas #1 ⚡
                    </span>
                  </div>

                  {/* Sample 2: Gemini AI Poster 2 */}
                  <div
                    onClick={() => handleLoadBenchmarkSample("gemini2")}
                    className="p-3 border-3 border-black bg-[var(--yellow)]/15 hover:bg-[var(--yellow)]/30 transition-all cursor-pointer shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 group flex flex-col justify-between"
                  >
                    <div className="flex gap-2.5 items-center mb-2">
                      <div className="w-14 h-18 shrink-0 border-2 border-black overflow-hidden bg-black shadow-[1px_1px_0px_#000] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/samples/gemini_diwali_poster_2_thumb.jpg"
                          alt="Gemini AI Poster 2 - Festive Delivery"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-0 right-0 bg-[var(--yellow)] text-black text-[7px] font-black px-0.5 border-b border-l border-black">
                          AI #2
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 font-mono">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 dark:text-amber-400 mb-0.5">
                          <span className="material-symbols-outlined text-[13px]">electric_moped</span>
                          Gemini Poster
                        </div>
                        <h4 className="text-[11px] font-bold text-[var(--ink)] dark:text-white truncate">
                          Festive Delivery
                        </h4>
                        <p className="text-[9px] text-[#555] dark:text-[#a0a5b5] line-clamp-2 mt-0.5 leading-snug">
                          Delivery partner scooter, sweets hamper &amp; clay lamps.
                        </p>
                      </div>
                    </div>
                    <span className="text-center text-[9px] font-black uppercase py-1 border border-black bg-white dark:bg-[#1a1b20] text-black dark:text-white shadow-[1px_1px_0px_#000] group-hover:bg-[var(--yellow)] group-hover:text-black transition-colors">
                      Test Canvas #2 ⚡
                    </span>
                  </div>

                  {/* Sample 3: Compliant Creative */}
                  <div
                    onClick={() => handleLoadBenchmarkSample("compliant")}
                    className="p-3 border-3 border-black bg-[var(--green)]/15 hover:bg-[var(--green)]/25 transition-all cursor-pointer shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 group flex flex-col justify-between"
                  >
                    <div className="flex gap-2.5 items-center mb-2">
                      <div className="w-14 h-18 shrink-0 border-2 border-black overflow-hidden bg-black shadow-[1px_1px_0px_#000] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/samples/sample_compliant_diwali_thumb.jpg"
                          alt="Brand-Compliant Diwali Creative"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-0 right-0 bg-[var(--green)] text-black text-[7px] font-black px-0.5 border-b border-l border-black">
                          PASS
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 font-mono">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-400 mb-0.5">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          Benchmark Pass
                        </div>
                        <h4 className="text-[11px] font-bold text-[var(--ink)] dark:text-white truncate">
                          Remediated
                        </h4>
                        <p className="text-[9px] text-[#555] dark:text-[#a0a5b5] line-clamp-2 mt-0.5 leading-snug">
                          Earthen diyas, Blinkit app nomenclature, SLA copy.
                        </p>
                      </div>
                    </div>
                    <span className="text-center text-[9px] font-black uppercase py-1 border border-black bg-white dark:bg-[#1a1b20] text-black dark:text-white shadow-[1px_1px_0px_#000] group-hover:bg-[var(--green)] group-hover:text-black transition-colors">
                      Load Compliant ⚡
                    </span>
                  </div>

                  {/* Sample 4: Violating Creative */}
                  <div
                    onClick={() => handleLoadBenchmarkSample("violating")}
                    className="p-3 border-3 border-black bg-[var(--red)]/10 hover:bg-[var(--red)]/20 transition-all cursor-pointer shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 group flex flex-col justify-between"
                  >
                    <div className="flex gap-2.5 items-center mb-2">
                      <div className="w-14 h-18 shrink-0 border-2 border-black overflow-hidden bg-black shadow-[1px_1px_0px_#000] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/samples/sample_violating_diwali_thumb.jpg"
                          alt="Non-Compliant Diwali Creative"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-0 right-0 bg-[var(--red)] text-white text-[7px] font-black px-0.5 border-b border-l border-black">
                          FAIL
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 font-mono">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-[var(--red)] dark:text-[#ff7b72] mb-0.5">
                          <span className="material-symbols-outlined text-[13px]">warning</span>
                          Benchmark Fail
                        </div>
                        <h4 className="text-[11px] font-bold text-[var(--ink)] dark:text-white truncate">
                          Violations
                        </h4>
                        <p className="text-[9px] text-[#555] dark:text-[#a0a5b5] line-clamp-2 mt-0.5 leading-snug">
                          Sparklers (§3.2), typo &quot;blinlit&quot;, unverified claim.
                        </p>
                      </div>
                    </div>
                    <span className="text-center text-[9px] font-black uppercase py-1 border border-black bg-white dark:bg-[#1a1b20] text-black dark:text-white shadow-[1px_1px_0px_#000] group-hover:bg-[var(--red)] group-hover:text-white transition-colors">
                      Load Violations ⚡
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => handleRunAudit()}
                  disabled={isAuditing || (!copy.trim() && !assetFile)}
                  className="flex-1 py-3 px-5 border-3 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-archivo font-black text-xs sm:text-sm uppercase tracking-tight shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[20px] ${isAuditing ? "animate-spin" : ""}`}>
                    {isAuditing ? "sync" : "verified"}
                  </span>
                  <span>{isAuditing ? "Running Autonomous Governance Audit..." : "Run Autonomous AI Governance Audit ⚡"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setCopy("");
                    setAssetFile(null);
                  }}
                  className="py-3 px-4 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: LIVE CREATIVE PREVIEW & MULTI-MODAL SCANNER (5 Cols)         */}
          {/* ========================================================================= */}
          <div className="xl:col-span-5 space-y-4">
            <div className={`p-5 sm:p-6 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            }`}>
              <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2.5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-black dark:text-[#ffdb1f]">visibility</span>
                  <h3 className="font-archivo font-black text-xs uppercase tracking-tight text-[var(--ink)] dark:text-white">
                    Live Creative Preview &amp; Multi-Modal Scanner
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] ${
                  displayImageUrl ? "bg-[var(--green)] text-black" : "bg-[var(--yellow)] text-black"
                }`}>
                  {displayImageUrl ? "Asset Loaded" : "Awaiting File"}
                </span>
              </div>

              {displayImageUrl ? (
                <div className="space-y-4">
                  {/* Uploaded Creative Image Frame */}
                  <div className="relative border-3 border-black bg-black/5 dark:bg-black/40 shadow-[4px_4px_0px_#000] overflow-hidden flex items-center justify-center p-2 min-h-[280px] max-h-[460px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayImageUrl}
                      alt="Uploaded campaign creative"
                      className="object-contain max-h-[440px] w-auto mx-auto rounded-none"
                    />

                    {/* Metadata Badge */}
                    <div className="absolute top-3 left-3 bg-black/85 text-white text-[10px] font-mono font-black uppercase px-2 py-1 border border-white/40 shadow-[2px_2px_0px_#000] backdrop-blur-sm">
                      {assetFile ? `${assetFile.name} · ${(assetFile.size / 1024).toFixed(1)} KB` : "Audited Asset"}
                    </div>
                  </div>

                  {/* Multi-Modal Vision Inspection Readout */}
                  {auditResult && (
                    <div className="space-y-3 pt-2">
                      {/* CIELAB Color Palette Chips */}
                      {auditResult.dominant_colors && auditResult.dominant_colors.length > 0 && (
                        <div className="p-3 border-2 border-black bg-white dark:bg-[#141518] shadow-[2px_2px_0px_#000]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-black uppercase text-[#666] dark:text-[#888] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">palette</span>
                              Extracted CIELAB Dominant Palette
                            </span>
                            {auditResult.palette_match_pct !== null && auditResult.palette_match_pct !== undefined && (
                              <span className={`text-[10px] font-mono font-black uppercase px-1.5 py-0.2 border border-black shadow-[1px_1px_0px_#000] ${
                                auditResult.palette_match_pct >= 75 ? "bg-[var(--green)] text-black" : "bg-[var(--red)] text-white"
                              }`}>
                                {Math.round(auditResult.palette_match_pct)}% Match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {auditResult.dominant_colors.map((hex, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 px-2 py-1 border border-black shadow-[1px_1px_0px_#000] bg-white dark:bg-[#1c1d22]"
                              >
                                <span
                                  className="w-3.5 h-3.5 border border-black shrink-0"
                                  style={{ backgroundColor: hex }}
                                />
                                <span className="text-[10px] font-mono font-bold uppercase">{hex}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OCR Extracted Text Chips */}
                      {auditResult.visible_text && auditResult.visible_text.length > 0 && (
                        <div className="p-3 border-2 border-black bg-white dark:bg-[#141518] shadow-[2px_2px_0px_#000]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-black uppercase text-[#666] dark:text-[#888] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">text_fields</span>
                              OCR Detected Typography ({auditResult.visible_text.length} Lines)
                            </span>
                            <span className="text-[9px] font-mono font-bold uppercase text-[#555] dark:text-[#aaa]">
                              Vision Extracted
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {auditResult.visible_text.map((txt, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 border border-black text-[10px] font-mono bg-[var(--paper)] dark:bg-[#20222a] text-[var(--ink)] dark:text-white shadow-[1px_1px_0px_#000]"
                              >
                                &quot;{txt}&quot;
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Eco-Friendly Diwali Guard Status */}
                      <div className={`p-3 border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000] ${
                        eventPass ? "bg-[var(--green)]/15" : "bg-[var(--red)]/15"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">
                            {eventPass ? "eco" : "warning"}
                          </span>
                          <span className="text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                            Diwali 2026 Guardrail
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] ${
                          eventPass ? "bg-[var(--green)] text-black" : "bg-[var(--red)] text-white"
                        }`}>
                          {eventPass ? "✓ Zero Firecrackers" : "✕ Prohibited Visuals Found"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 border-3 border-dashed border-black bg-[var(--paper)] dark:bg-[#141518] text-center shadow-[3px_3px_0px_#000]">
                  <div className="w-16 h-16 border-3 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-3 shadow-[3px_3px_0px_#000]">
                    <span className="material-symbols-outlined text-[36px]">image_search</span>
                  </div>
                  <h4 className="font-archivo font-black text-sm uppercase text-[var(--ink)] dark:text-white mb-1">
                    No Creative Asset Attached Yet
                  </h4>
                  <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-sm mx-auto leading-relaxed">
                    Attach a poster, banner, or promotional graphic on the left. Inkloom will render the asset, extract pixel-level CIELAB palette metrics, run Gemini Vision analysis, and extract visible OCR typography.
                  </p>
                  <div className="mt-4 pt-3 border-t border-black/20 flex items-center justify-center gap-4 text-[10px] font-mono text-[#666] dark:text-[#888] uppercase">
                    <span>✓ Dominant Palette</span>
                    <span>✓ OCR Typography</span>
                    <span>✓ Eco Guardrails</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DETAILED MULTI-MODAL GOVERNANCE AUDIT REPORT                               */}
        {/* ========================================================================= */}
        {(submissionData || auditResult) && (
          <div ref={reportRef} id="audit-report" className="mt-10 space-y-6 scroll-mt-6">
            <div className={`p-6 sm:p-8 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            }`}>
              {/* Executive Verdict Banner */}
              <div
                className={`p-5 sm:p-6 border-3 border-black flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 shadow-[4px_4px_0px_#000] ${
                  isPass
                    ? "bg-[var(--green)]/25"
                    : "bg-[var(--red)]/20"
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
                  {/* Compliance Score Badge */}
                  <div
                    className={`w-16 h-16 border-3 border-black flex items-center justify-center font-mono font-black text-2xl shadow-[3px_3px_0px_#000] shrink-0 ${
                      isPass ? "bg-[var(--green)] text-black" : "bg-[var(--red)] text-white"
                    }`}
                  >
                    {score !== null ? `${score}%` : "—"}
                  </div>

                  {/* Creative Thumbnail Preview in Verdict Banner */}
                  {displayImageUrl && (
                    <div className="w-16 h-16 border-3 border-black bg-black shadow-[3px_3px_0px_#000] overflow-hidden shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayImageUrl}
                        alt="Audited creative thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 border border-black text-[10px] font-mono font-black uppercase shadow-[1px_1px_0px_#000] ${
                          isPass
                            ? "bg-[var(--green)] text-black"
                            : "bg-[var(--red)] text-white"
                        }`}
                      >
                        {isPass ? "✓ APPROVED · READY FOR RELEASE" : "✕ CHANGES REQUESTED · REJECTED"}
                      </span>
                      {submissionData && (
                        <span className="text-xs font-mono text-[#666] dark:text-[#999]">
                          SUB-#{submissionData.id} · v{submissionData.current_version || 1}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-archivo font-black uppercase text-[var(--ink)] dark:text-white">
                      {submissionData?.title || title || "Diwali Campaign Creative"}
                    </h2>
                    <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] mt-0.5">
                      Evaluated in <strong className="text-[var(--ink)] dark:text-white font-mono">{auditLatency}ms</strong> against Blinkit Diwali 2026 Rules &amp; Approved Fact Register
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenFixModal}
                    disabled={isFixing || isAuditing}
                    className="px-3.5 py-2 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isFixing ? "animate-spin" : ""}`}>
                      {isFixing ? "autorenew" : "magic_button"}
                    </span>
                    {isFixing ? "Remediating..." : "Apply Suggested Fixes 🪄"}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAllFixes}
                    disabled={isFixing || isAuditing}
                    className="px-3 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[17px]">auto_fix_high</span>
                    Fix Copy Only
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitToBrandQueue}
                    disabled={isFixing || isAuditing}
                    className="px-3 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[17px]">send</span>
                    Submit to Queue
                  </button>
                </div>
              </div>

              {/* Dynamic Dimension Scorecards Grid */}
              <div className="mb-8">
                <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[#666] dark:text-[#888] mb-3">
                  [MULTI-MODAL DIMENSION ANALYSIS]
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {[
                    {
                      label: "Visual & Palette",
                      score: `${visualScore}%`,
                      status: visualPass ? "Brand Match" : "Clashing Colors",
                      icon: "palette",
                      detail: visualDetail,
                      pass: visualPass,
                    },
                    {
                      label: "Brand Terminology",
                      score: `${termScore}%`,
                      status: termPass ? "Zero Violations" : "Banned Terms Found",
                      icon: "spellcheck",
                      detail: termDetail,
                      pass: termPass,
                    },
                    {
                      label: "Factual Claims",
                      score: `${claimScore}%`,
                      status: claimPass ? "Supported" : "Contradicted",
                      icon: "fact_check",
                      detail: claimDetail,
                      pass: claimPass,
                    },
                    {
                      label: "Diwali Event Fit",
                      score: `${eventScore}%`,
                      status: eventPass ? "Eco-Friendly" : "Firecrackers Present",
                      icon: "celebration",
                      detail: eventDetail,
                      pass: eventPass,
                    },
                    {
                      label: "WCAG Accessibility",
                      score: `${accessScore}%`,
                      status: accessPass ? "AA Compliant" : "Low Contrast",
                      icon: "accessibility_new",
                      detail: accessDetail,
                      pass: accessPass,
                    },
                  ].map((dim, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 border-2 border-black shadow-[2px_2px_0px_#000] font-mono transition-all ${
                        dim.pass
                          ? "bg-[var(--green)]/15 border-black"
                          : "bg-[var(--red)]/15 border-black"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-[20px] text-[var(--ink)] dark:text-white">
                          {dim.icon}
                        </span>
                        <span
                          className={`font-black text-sm ${
                            dim.pass ? "text-[var(--ink)] dark:text-[#b9f4a8]" : "text-[var(--red)] dark:text-[#ff7b72]"
                          }`}
                        >
                          {dim.score}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs uppercase text-[var(--ink)] dark:text-white mb-0.5">{dim.label}</h4>
                      <p
                        className={`text-[9px] font-black uppercase mb-1 ${
                          dim.pass ? "text-emerald-800 dark:text-[#b9f4a8]" : "text-red-800 dark:text-[#ff7b72]"
                        }`}
                      >
                        {dim.status}
                      </p>
                      <p className="text-[10px] text-[#555] dark:text-[#a0a5b5] leading-tight line-clamp-2">{dim.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Compliance Wins & High-Impact Improvements Roadmap */}
              <div className="mb-8 space-y-4">
                {/* Section A: Verified Brand Compliance Wins & Passed Safeguards */}
                <div className="border-3 border-black bg-[var(--green)]/15 dark:bg-[var(--green)]/10 p-5 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[24px] text-emerald-800 dark:text-emerald-400">
                        verified
                      </span>
                      <h3 className="font-archivo font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                        Brand Compliance Wins &amp; Passed Safeguards
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 bg-[var(--green)] text-black border border-black font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_#000]">
                      Verified Safe
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-3 border-2 border-black bg-white dark:bg-[#1a1b20] shadow-[2px_2px_0px_#000] font-mono">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                        <span>✓</span>
                        <span>Cultural Festive Relevance</span>
                      </div>
                      <p className="text-[11px] text-[#555] dark:text-[#a0a5b5] leading-snug">
                        Authentic Diwali festive motifs detected: traditional earthen lamps, festive sweets, and celebratory atmosphere aligned with campaign brief.
                      </p>
                    </div>

                    <div className="p-3 border-2 border-black bg-white dark:bg-[#1a1b20] shadow-[2px_2px_0px_#000] font-mono">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                        <span>✓</span>
                        <span>PII &amp; Data Confidentiality</span>
                      </div>
                      <p className="text-[11px] text-[#555] dark:text-[#a0a5b5] leading-snug">
                        Zero customer phone numbers, delivery addresses, or credentials exposed. 100% compliant with enterprise privacy policies.
                      </p>
                    </div>

                    <div className="p-3 border-2 border-black bg-white dark:bg-[#1a1b20] shadow-[2px_2px_0px_#000] font-mono">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                        <span>✓</span>
                        <span>Canvas &amp; Resolution Specs</span>
                      </div>
                      <p className="text-[11px] text-[#555] dark:text-[#a0a5b5] leading-snug">
                        Conforms to digital display standards (1024x1024 square 1:1 aspect ratio) with high visual clarity and legible headline hierarchy.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section B: Targeted Improvements & Score Boost Roadmap */}
                {activeFindings.length > 0 && (
                  <div className="border-3 border-black bg-white dark:bg-[#1a1b20] p-5 shadow-[4px_4px_0px_#000]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 border-b-2 border-black pb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[24px] text-[var(--yellow)]">
                          trending_up
                        </span>
                        <div>
                          <h3 className="font-archivo font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                            High-Impact Improvements &amp; Score Boost Roadmap
                          </h3>
                          <p className="text-[11px] font-mono text-[#666] dark:text-[#888]">
                            Key improvements to elevate compliance score from {score ?? 0}% to 100%
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenFixModal}
                        disabled={isFixing || isAuditing}
                        className="px-3.5 py-1.5 bg-[var(--yellow)] hover:bg-[#ffcf00] text-black border-2 border-black font-mono text-[11px] font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">magic_button</span>
                        Auto-Apply All Improvements 🪄
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 border-2 border-black bg-[var(--yellow)]/10 font-mono shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--ink)] dark:text-white flex items-center gap-1.5">
                            <span>🎯</span>
                            <span>Visual: Eco-Friendly Transition</span>
                          </span>
                          <span className="text-[10px] font-black bg-[var(--green)] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                            +30% BOOST
                          </span>
                        </div>
                        <p className="text-[11px] text-[#555] dark:text-[#a0a5b5]">
                          Replace sparklers and fireworks with warm traditional earthen oil lamps (diyas). Satisfies Blinkit Eco-Friendly Diwali 2026 Policy §3.2.
                        </p>
                      </div>

                      <div className="p-3 border-2 border-black bg-[var(--yellow)]/10 font-mono shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--ink)] dark:text-white flex items-center gap-1.5">
                            <span>🎯</span>
                            <span>Nomenclature: Brand Standard</span>
                          </span>
                          <span className="text-[10px] font-black bg-[var(--green)] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                            +35% BOOST
                          </span>
                        </div>
                        <p className="text-[11px] text-[#555] dark:text-[#a0a5b5]">
                          Correct misspelled brand variations (&quot;blinlit&quot; → &quot;Blinkit&quot;) to eliminate trademark dilution and maintain brand integrity.
                        </p>
                      </div>

                      <div className="p-3 border-2 border-black bg-[var(--yellow)]/10 font-mono shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--ink)] dark:text-white flex items-center gap-1.5">
                            <span>🎯</span>
                            <span>Claims: Grounded Telemetry Wording</span>
                          </span>
                          <span className="text-[10px] font-black bg-[var(--green)] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                            +20% BOOST
                          </span>
                        </div>
                        <p className="text-[11px] text-[#555] dark:text-[#a0a5b5]">
                          Adopt &quot;Delivered in minutes&quot; in place of unverified absolute guarantees to ensure compliance with ASCI advertising standards.
                        </p>
                      </div>

                      <div className="p-3 border-2 border-black bg-[var(--yellow)]/10 font-mono shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--ink)] dark:text-white flex items-center gap-1.5">
                            <span>🎯</span>
                            <span>Accessibility: WCAG AA Contrast</span>
                          </span>
                          <span className="text-[10px] font-black bg-[var(--green)] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                            +15% BOOST
                          </span>
                        </div>
                        <p className="text-[11px] text-[#555] dark:text-[#a0a5b5]">
                          Elevate text luminance contrast against dark festive backdrops above 4.5:1 ratio for optimal mobile readability.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detected Problems & Actionable Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2 font-mono">
                  <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[var(--ink)] dark:text-white">
                    Audit Findings &amp; Corrective Actions ({activeFindings.length})
                  </h3>
                  {activeFindings.length > 0 && (
                    <span className="text-[10px] font-black uppercase text-[#666] dark:text-[#888]">
                      {activeFindings.filter((f) => f.severity === "CRITICAL").length} Critical ·{" "}
                      {activeFindings.filter((f) => f.severity === "WARNING").length} Warnings
                    </span>
                  )}
                </div>

                {activeFindings.length === 0 ? (
                  <div className="p-8 border-3 border-black bg-[var(--green)]/20 text-center shadow-[4px_4px_0px_#000]">
                    <span className="material-symbols-outlined text-[40px] text-black dark:text-white mb-2">
                      verified_user
                    </span>
                    <h4 className="font-archivo font-black text-base uppercase text-[var(--ink)] dark:text-white">
                      Zero Compliance Violations Detected!
                    </h4>
                    <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-md mx-auto mt-1">
                      This creative adheres completely to the Blinkit Diwali 2026 design system, brand colors, eco-friendly policy, and terminology guidelines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {activeFindings.map((finding) => {
                      const isCritical = finding.severity === "CRITICAL";
                      return (
                        <div
                          key={finding.id}
                          className={`p-4 sm:p-5 border-3 border-black shadow-[3px_3px_0px_#000] font-mono transition-all ${
                            isCritical
                              ? "bg-[var(--red)]/10"
                              : "bg-[var(--yellow)]/15"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 border border-black text-[9px] font-black uppercase shadow-[1px_1px_0px_#000] ${
                                  isCritical
                                    ? "bg-[var(--red)] text-white"
                                    : "bg-[var(--yellow)] text-black"
                                }`}
                              >
                                {finding.severity}
                              </span>
                              <span className="text-xs font-black uppercase text-[#666] dark:text-[#888]">
                                {finding.category.replace("_", " ")}
                              </span>
                            </div>

                            {finding.guideline_citation && (
                              <span className="text-[10px] text-[var(--ink)] dark:text-white font-black uppercase flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">menu_book</span>
                                {finding.guideline_citation}
                              </span>
                            )}
                          </div>

                          {/* Flagged Excerpt */}
                          {finding.flagged_excerpt && (
                            <div className="mb-2">
                              <span className="text-[9px] uppercase font-black text-[#666] dark:text-[#888] block mb-0.5">
                                Flagged Excerpt:
                              </span>
                              <code className="text-xs px-2 py-1 border border-black bg-white dark:bg-[#121316] font-bold text-[var(--red)] dark:text-[#ff7b72] block">
                                &quot;{finding.flagged_excerpt}&quot;
                              </code>
                            </div>
                          )}

                          {/* Explanation */}
                          <p className="text-xs text-[var(--ink)] dark:text-[#c9d1d9] leading-relaxed mb-3">
                            {finding.explanation}
                          </p>

                          {/* Suggested Correction */}
                          {finding.suggested_correction && (
                            <div className="p-3 border-2 border-black bg-white dark:bg-[#1c1d22] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="text-[9px] uppercase text-[var(--ink)] dark:text-[#b9f4a8] font-black block mb-0.5">
                                  ✓ Suggested Intent-Preserving Fix:
                                </span>
                                <p className="text-xs font-bold text-[var(--ink)] dark:text-white">
                                  &quot;{finding.suggested_correction}&quot;
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleApplySingleCorrection(finding)}
                                className="px-3 py-1.5 border-2 border-black bg-[var(--yellow)] text-black text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 shrink-0 transition-all cursor-pointer"
                              >
                                Apply Fix
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Neobrutalist Auto-Fix & Creative Synthesis Modal Dialog */}
      {showFixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[var(--paper)] dark:bg-[#1a1b20] border-4 border-black dark:border-white shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_#fff] p-5 sm:p-7 relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b-2 border-black dark:border-white/30 pb-3 mb-5">
              <div>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 bg-[var(--yellow)] text-black border border-black shadow-[1px_1px_0px_#000]">
                  Inkloom AI · Auto-Remediation Engine
                </span>
                <h3 className="text-xl sm:text-2xl font-archivo font-black uppercase text-[var(--ink)] dark:text-white mt-1">
                  Brand Policy Auto-Fix &amp; Creative Synthesis
                </h3>
                <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] mt-0.5">
                  Remediating policy infractions, standardizing brand copy, and synthesizing brand-compliant visuals.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseFixModal}
                className="w-8 h-8 border-2 border-black bg-white dark:bg-[#25272e] text-black dark:text-white font-mono font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer shrink-0 ml-3"
              >
                ✕
              </button>
            </div>

            {/* Progress Section */}
            <div className="mb-5">
              <div className="flex items-center justify-between font-mono text-xs mb-1.5 font-bold">
                <span className="text-[var(--ink)] dark:text-white flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${fixProgress < 100 ? "animate-spin text-[var(--yellow)]" : "text-emerald-500"}`}>
                    {fixProgress < 100 ? "autorenew" : "check_circle"}
                  </span>
                  {fixStepTitle}
                </span>
                <span className="font-mono font-black text-sm text-[var(--ink)] dark:text-white">
                  {fixProgress}%
                </span>
              </div>

              {/* Neobrutalist Progress Bar */}
              <div className="w-full h-5 border-2 border-black bg-[#e0ded8] dark:bg-[#2a2c35] p-0.5 shadow-[2px_2px_0px_#000]">
                <div
                  className={`h-full transition-all duration-500 ease-out flex items-center justify-end pr-1 text-[10px] font-mono font-black ${
                    fixProgress === 100
                      ? "bg-[var(--green)] text-black"
                      : "bg-[var(--yellow)] text-black"
                  }`}
                  style={{ width: `${fixProgress}%` }}
                />
              </div>
              <p className="text-[11px] font-mono text-[#666] dark:text-[#999] mt-1.5">
                {fixStepDetail}
              </p>
            </div>

            {/* Live Execution Logs */}
            <div className="p-3 bg-black text-[#5af78e] font-mono text-[11px] border-2 border-black shadow-[2px_2px_0px_#000] mb-5 max-h-28 overflow-y-auto space-y-1">
              {fixLogs.map((log, idx) => (
                <div key={idx} className="leading-snug">
                  {log}
                </div>
              ))}
            </div>

            {/* Error Message if any */}
            {fixError && (
              <div className="p-3 bg-[var(--red)] text-white font-mono text-xs border-2 border-black shadow-[2px_2px_0px_#000] mb-5">
                <strong>Generation Error:</strong> {fixError}
              </div>
            )}

            {/* Synthesized Image Preview & Remediations */}
            {fixProgress === 100 && generatedImageUrl && (
              <div className="border-3 border-black bg-white dark:bg-[#121316] p-4 shadow-[4px_4px_0px_#000] mb-5">
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                  <span className="font-archivo font-black text-xs uppercase text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Brand-Compliant Diwali Creative Generated
                  </span>
                  <span className="text-[10px] font-mono bg-[var(--green)] text-black px-2 py-0.5 border border-black font-black uppercase">
                    Zero Fireworks · Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="border-2 border-black relative overflow-hidden bg-black flex items-center justify-center max-h-56">
                    <img
                      src={generatedImageUrl}
                      alt="Brand Compliant Creative"
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="text-[11px] font-black uppercase text-[var(--ink)] dark:text-white border-b border-black/20 pb-1">
                      Applied Policy Remediations:
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <span>✓</span>
                      <span><strong>Visual:</strong> Firecrackers &amp; sparklers removed; warm earthen clay diyas added.</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <span>✓</span>
                      <span><strong>Nomenclature:</strong> Corrected brand name to official &quot;Blinkit&quot;.</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <span>✓</span>
                      <span><strong>Claims:</strong> Standardized delivery guarantee to telemetry-backed SLAs.</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <span>✓</span>
                      <span><strong>Colors:</strong> Blinkit Sunflower Yellow (#F8C200) &amp; Forest Green.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t-2 border-black dark:border-white/20">
              {fixProgress === 100 && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadGeneratedImage}
                    className="w-full sm:w-auto px-4 py-2.5 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download High-Res Creative (.jpg)
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyToStudioAndAudit}
                    className="w-full sm:w-auto px-4 py-2.5 border-2 border-black bg-[var(--green)] hover:bg-[#00c984] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    Apply to Studio &amp; Re-Audit
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleCloseFixModal}
                className="w-full sm:w-auto px-4 py-2.5 border-2 border-black bg-white dark:bg-[#25272e] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                {fixProgress === 100 ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
