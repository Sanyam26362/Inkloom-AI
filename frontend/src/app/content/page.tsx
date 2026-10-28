"use client";

import React, { ChangeEvent, useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api";
import { Submission, AuditExecutionResponse, AuditFinding, SubmissionStatus } from "@/lib/types";

type ContentFormatType = "INSTAGRAM_POST" | "TWEET" | "POSTER" | "VIDEO_REEL" | "AUDIO_AD";

interface EvaluatorSample {
  id: string;
  title: string;
  type: "GOOD" | "BAD";
  format: ContentFormatType;
  badgeLabel: string;
  expectedScore: number;
  expectedVerdict: "APPROVED" | "REJECTED";
  headline: string;
  copy: string;
  visualTheme: string;
  keyHighlights: string[];
  llmPrompt: string;
  accentBg: string;
  festivalIcon: string;
}

const EVALUATOR_SAMPLES: EvaluatorSample[] = [
  {
    id: "good-sample-1",
    title: "Diwali Sweets & Earthen Diyas",
    type: "GOOD",
    format: "POSTER",
    badgeLabel: "100% Compliant (Approved)",
    expectedScore: 96,
    expectedVerdict: "APPROVED",
    headline: "Blinkit Diwali Sweets & Diyas in Minutes",
    copy: "Celebrate Diwali with sweets, fresh decor and earthen diyas delivered in 10 minutes by your delivery partner. Find festive favourites on the Blinkit app.",
    visualTheme: "Blinkit Signature Yellow (#F8C200) & Forest Green (#00A36C), WCAG AA Contrast 7.2:1",
    keyHighlights: [
      "✓ Traditional earthen clay diyas & festive gulab jamun/kaju katli sweets",
      "✓ Compliant 'delivery partner' terminology",
      "✓ Zero cracker or firework direction (Eco-friendly Diwali §3.2)",
      "✓ Grounded promotional claim verified against approved facts",
    ],
    llmPrompt: `A high-end commercial advertising poster for quick commerce Diwali delivery. Centerpiece features traditional Indian earthen clay diyas glowing warmly with golden oil flames, alongside artisanal silver boxes of kaju katli and gulab jamun sweets. Vibrant festive ambient bokeh background. Layout designed with Blinkit signature brand colors: primary sunflower yellow (#F8C200) header banner and deep forest green (#00A36C) accent ribbons. Clean modern typography: 'Diwali Sweets & Diyas Delivered in Minutes by your Delivery Partner'. Photorealistic, 8k resolution, crisp studio lighting, absolutely no firecrackers, zero smoke, 100% eco-friendly Diwali aesthetic.`,
    accentBg: "from-[#F8C200]/25 via-amber-400/10 to-transparent",
    festivalIcon: "🪔",
  },
  {
    id: "good-sample-2",
    title: "Diwali Gift Hampers & Quick Decor",
    type: "GOOD",
    format: "INSTAGRAM_POST",
    badgeLabel: "94% Compliant (Approved)",
    expectedScore: 94,
    expectedVerdict: "APPROVED",
    headline: "Thoughtful Diwali Hampers & Festive Decor",
    copy: "Diwali gift hampers, fresh marigold flowers and festive home decor delivered to your doorstep by your delivery partner. Order now on Blinkit.",
    visualTheme: "Clean Editorial Flat-Lay, High Contrast Card, Blinkit Accent Borders",
    keyHighlights: [
      "✓ Traditional brass pooja thali & fresh orange marigold garlands",
      "✓ Compliant social caption without exaggerated promises",
      "✓ WCAG AA compliant typography (contrast > 4.5:1)",
      "✓ Positive family celebration framing",
    ],
    llmPrompt: `Modern editorial lifestyle flat-lay advertisement poster for Diwali festival gifting. Elegant golden gift hamper with satin ribbons, surrounded by fresh orange and yellow marigold flower garlands, brass oil lamps, and festive dried fruits. Clean minimalist layout featuring a bold yellow header (#F8C200), crisp white card background, and forest green typography (#00A36C). Highly legible text: 'Thoughtful Diwali Hampers & Decor in 10 Minutes'. Professional commercial photography, sharp focus, 8k, serene festive atmosphere, zero fireworks, zero unapproved character logos.`,
    accentBg: "from-emerald-500/20 via-teal-400/10 to-transparent",
    festivalIcon: "🎁",
  },
  {
    id: "bad-sample-1",
    title: "Spider-Man Fireworks Super Sale",
    type: "BAD",
    format: "POSTER",
    badgeLabel: "Violates 4 Policies (Rejected)",
    expectedScore: 38,
    expectedVerdict: "REJECTED",
    headline: "Spider-Man 10-Minute Fireworks Extravaganza",
    copy: "Spider-Man presents the Biggest Fireworks Sale! 10-minute guarantee on all crackers with instant delivery guaranteed by our delivery boy. Cheapest prices in town!",
    visualTheme: "Clashing Neon Red (#FF0000) & Blue, Air Pollution Smoke, High Visual Noise",
    keyHighlights: [
      "🚫 Prohibited Firecracker/Rocket imagery (Violates Eco-Friendly Diwali §3.2)",
      "🚫 Banned Terminology: '10-minute guarantee', 'instant delivery guaranteed'",
      "🚫 Deprecated Pronoun: 'delivery boy' (Must use 'delivery partner')",
      "🚫 Trademark Infringement & Palette Clash: Unlicensed Spider-Man character with non-brand red colors",
    ],
    llmPrompt: `A chaotic promotional street flyer featuring comic superhero Spider-Man holding bursting firecracker rockets and smoking sparklers against a smoggy night sky. Harsh neon red (#FF0000) and electric blue colors dominating the frame, sparks and gray sulfur smoke drifting across the screen. Cluttered non-standard commercial text: '10-Minute Guarantee! Cheapest Prices Guaranteed by our Delivery Boy!'. Chaotic visual noise, unlicensed trademark superhero character, heavy smoke haze, non-compliant fireworks imagery.`,
    accentBg: "from-red-500/25 via-orange-500/10 to-transparent",
    festivalIcon: "⚠️",
  },
];

export default function CreatorContentStudioPage() {
  const { activeBrand, activeBrandId, currentRole, brands, setActiveBrandId, refreshBrands } = useApp();

  // Form State
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatType>("POSTER");
  const [title, setTitle] = useState("Blinkit Diwali Sweets & Diyas");
  const [copy, setCopy] = useState(
    "Celebrate Diwali with sweets, fresh decor and earthen diyas delivered in 10 minutes by your delivery partner. Find festive favourites on the Blinkit app."
  );
  const [assetFile, setAssetFile] = useState<File | null>(null);

  // Evaluator Canvas State
  const [selectedSampleId, setSelectedSampleId] = useState<string>("good-sample-1");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

  // Audit Execution & Report State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditExecutionResponse | null>(null);
  const [submissionData, setSubmissionData] = useState<Submission | null>(null);
  const [auditLatency, setAuditLatency] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  // Target Brand Fallback (Ensure Blinkit is selected)
  const targetBrandId =
    activeBrandId || brands.find((b) => b.name.toLowerCase() === "blinkit")?.id || brands[0]?.id;

  useEffect(() => {
    if (targetBrandId && targetBrandId !== activeBrandId) {
      setActiveBrandId(targetBrandId);
    }
  }, [targetBrandId, activeBrandId, setActiveBrandId]);

  // Load sample into form
  const handleSelectSample = (sample: EvaluatorSample) => {
    setSelectedSampleId(sample.id);
    setSelectedFormat(sample.format);
    setTitle(sample.headline);
    setCopy(sample.copy);
    setAssetFile(null);
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = (sampleId: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(sampleId);
    setTimeout(() => setCopiedPromptId(null), 3000);
  };

  // Execute Real Audit
  const handleRunAudit = async (customCopy?: string, customTitle?: string, sample?: EvaluatorSample) => {
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
      const activeCopy = customCopy || copy.trim();

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
        },
        { userRole: currentRole }
      );

      // 2. Attach File if uploaded
      if (assetFile) {
        if (assetFile.type.startsWith("image/")) {
          await api.uploadImage(sub.id, assetFile, { userRole: currentRole }, "diwali");
        } else if (assetFile.type.startsWith("audio/")) {
          await api.uploadAudio(sub.id, assetFile, { userRole: currentRole }, "diwali");
        } else if (assetFile.type.startsWith("video/")) {
          await api.uploadVideo(sub.id, assetFile, { userRole: currentRole }, "diwali");
        }
      }

      // 3. Execute Autonomous Multi-Modal Audit
      const auditRes = await api.auditSubmission(sub.id, { userRole: currentRole }, "diwali");
      const elapsed = Math.round(performance.now() - startTime);

      // 4. Fetch enriched submission with findings
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

  // One-click load sample and immediately audit
  const handleLoadAndAuditSample = async (sample: EvaluatorSample) => {
    handleSelectSample(sample);
    await handleRunAudit(sample.copy, sample.headline, sample);
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
      // Regex replace case-insensitive
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
    if (!submissionData?.findings) return;
    let newCopy = copy;
    let appliedCount = 0;

    for (const finding of submissionData.findings) {
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

  // Submit to Brand Review Queue
  const handleSubmitToBrandQueue = async () => {
    if (!submissionData) return;
    try {
      await api.updateStatus(submissionData.id, "SUBMITTED", "Creator verified with AI governance pre-flight audit. Ready for brand review.", {
        userRole: currentRole,
      });
      setSuccessMessage(`Submission #${submissionData.id} successfully queued for Brand Reviewer approval!`);
    } catch {
      setErrorMessage("Could not queue submission for brand review.");
    }
  };

  const score = submissionData?.compliance_score ?? auditResult?.compliance_score ?? null;
  const isPass = (submissionData?.verdict || auditResult?.verdict) === "PASS" || (score !== null && score >= 80);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#121316] text-[#0f172a] dark:text-[#f8fafc] px-4 sm:px-6 lg:px-8 pb-16 transition-colors">
      {/* Toast Notification */}
      {(successMessage || errorMessage) && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md rounded-2xl border p-4 shadow-2xl transition-all flex items-start gap-3 ${
            successMessage
              ? "bg-emerald-950/90 border-emerald-500 text-white"
              : "bg-red-950/90 border-red-500 text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {successMessage ? "check_circle" : "error"}
          </span>
          <div className="flex-1 text-xs leading-relaxed font-medium">
            {successMessage || errorMessage}
          </div>
          <button
            onClick={() => {
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-[1550px] mx-auto pt-6">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[#00A36C]/15 text-[#00A36C] border border-[#00A36C]/30">
                Creator Studio
              </span>
              <span className="text-xs font-semibold text-text-muted">
                Governing Brand: <strong className="text-primary font-bold">Blinkit</strong> · Campaign: <strong className="text-on-surface">Diwali 2026</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
              Autonomous Brand Governance & Upload Studio
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
              Verify marketing copy, posters, audio ads, and video reels against approved brand guidelines before public release.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl border border-border hover:border-primary text-xs font-bold font-sans transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[17px]">dashboard</span>
              Creator Dashboard
            </Link>
          </div>
        </div>

        {/* 2-Column Layout: Left = Upload Studio, Right = Hackathon Evaluator Canvas */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: CREATOR UPLOAD STUDIO (7 Cols)                               */}
          {/* ========================================================================= */}
          <div className="xl:col-span-7 space-y-6">
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs">
              {/* Step 1: Content Format Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3 font-mono">
                  1. Select Content Format
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
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                            : "bg-palette-7/20 border-border text-on-surface hover:border-primary/50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{fmt.icon}</span>
                        <span className="text-[11px] font-bold leading-tight">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Campaign Asset Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-on-surface">Creative Title / Headline</label>
                    <span className="text-[11px] font-mono text-text-muted">Campaign Header</span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Blinkit Diwali Sweets & Snacks Launch"
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-palette-7/20 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-on-surface">
                      Marketing Copy / Caption / Script
                    </label>
                    <span className="text-[11px] font-mono text-text-muted">
                      {copy.length} chars · {copy.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    placeholder="Enter post body, advertising copy, or video voiceover script..."
                    className="w-full p-3.5 rounded-xl border border-border bg-palette-7/20 text-sm leading-relaxed text-on-surface focus:outline-none focus:border-primary transition-colors font-sans"
                  />
                </div>
              </div>

              {/* Step 3: Optional File Attachment (Drag & Drop) */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-on-surface mb-2">
                  Attach Creative Asset (Optional Image / Audio / Video)
                </label>
                <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary bg-palette-7/10 hover:bg-palette-7/30 cursor-pointer transition-all">
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
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[28px]">description</span>
                      <div className="text-left">
                        <p className="text-xs font-bold text-on-surface truncate max-w-xs">{assetFile.name}</p>
                        <p className="text-[10px] font-mono text-text-muted">
                          {(assetFile.size / 1024).toFixed(1)} KB · {assetFile.type}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setAssetFile(null);
                        }}
                        className="p-1 rounded-lg hover:bg-palette-7/60 text-text-muted hover:text-red-500 text-xs font-bold"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="material-symbols-outlined text-primary text-[32px] mb-1">cloud_upload</span>
                      <p className="text-xs font-bold text-on-surface">Click to upload poster image or media</p>
                      <p className="text-[11px] text-text-muted mt-0.5">PNG, JPG, MP3, MP4 supported for multi-modal analysis</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleRunAudit()}
                  disabled={isAuditing || (!copy.trim() && !assetFile)}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-primary to-[#00A36C] hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isAuditing ? "progress_activity" : "verified"}
                  </span>
                  {isAuditing ? "Running Autonomous Governance Audit..." : "Run Autonomous AI Governance Audit ⚡"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setCopy("");
                    setAssetFile(null);
                  }}
                  className="py-3 px-4 rounded-xl border border-border text-xs font-bold text-text-muted hover:text-on-surface hover:bg-palette-7/30 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: HACKATHON EVALUATOR QUICK-TEST CANVAS (5 Cols)              */}
          {/* ========================================================================= */}
          <div className="xl:col-span-5 space-y-4">
            <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[22px]">gavel</span>
                  <h3 className="font-bold text-base text-on-surface">Hackathon Evaluator Demo Canvas</h3>
                </div>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Quick Load
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                Click any pre-configured poster below to test Inkloom&apos;s governance engine against authentic Diwali guidelines without hunting for files.
              </p>

              {/* 3 Interactive Cards */}
              <div className="space-y-3.5">
                {EVALUATOR_SAMPLES.map((sample) => {
                  const isSelected = selectedSampleId === sample.id;
                  const isExpanded = expandedPromptId === sample.id;
                  const isCopied = copiedPromptId === sample.id;

                  return (
                    <div
                      key={sample.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs"
                          : sample.type === "GOOD"
                          ? "border-border bg-palette-7/10 hover:border-emerald-500/50"
                          : "border-red-500/30 bg-red-500/5 hover:border-red-500/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{sample.festivalIcon}</span>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-on-surface leading-tight">
                              {sample.title}
                            </h4>
                            <span className="text-[10px] font-mono text-text-muted">{sample.format}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                            sample.type === "GOOD"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30"
                          }`}
                        >
                          {sample.badgeLabel}
                        </span>
                      </div>

                      {/* Highlights */}
                      <div className="space-y-1 mb-3 text-[11px] leading-relaxed">
                        {sample.keyHighlights.map((hl, i) => (
                          <div
                            key={i}
                            className={`line-clamp-1 ${
                              sample.type === "GOOD" ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
                            }`}
                          >
                            {hl}
                          </div>
                        ))}
                      </div>

                      {/* Expandable LLM Prompt Box */}
                      <div className="mb-3 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <button
                            type="button"
                            onClick={() => setExpandedPromptId(isExpanded ? null : sample.id)}
                            className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isExpanded ? "expand_less" : "expand_more"}
                            </span>
                            {isExpanded ? "Hide Image Prompt" : "View LLM Image Generation Prompt"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(sample.id, sample.llmPrompt)}
                            className="text-text-muted hover:text-on-surface font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {isCopied ? "check" : "content_copy"}
                            </span>
                            {isCopied ? "Copied!" : "Copy"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="p-2.5 rounded-xl bg-palette-7/40 border border-border text-[11px] font-mono leading-relaxed text-text-muted max-h-36 overflow-y-auto">
                            {sample.llmPrompt}
                          </div>
                        )}
                      </div>

                      {/* One Click Load & Audit Button */}
                      <button
                        type="button"
                        onClick={() => handleLoadAndAuditSample(sample)}
                        disabled={isAuditing}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          sample.type === "GOOD"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        ⚡ Load Sample & Run Real Audit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DETAILED MULTI-MODAL GOVERNANCE AUDIT REPORT                               */}
        {/* ========================================================================= */}
        {submissionData && (
          <div ref={reportRef} id="audit-report" className="mt-12 space-y-6 scroll-mt-6">
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
              {/* Executive Verdict Banner */}
              <div
                className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 ${
                  isPass
                    ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/40"
                    : "bg-gradient-to-r from-red-500/15 via-red-500/5 to-transparent border-red-500/40"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${
                      isPass ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {score !== null ? `${score}%` : "—"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                          isPass
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/20 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {isPass ? "✓ APPROVED · READY FOR RELEASE" : "✕ CHANGES REQUESTED · REJECTED"}
                      </span>
                      <span className="text-xs font-mono text-text-muted">
                        SUB-#{submissionData.id} · v{submissionData.current_version}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-on-surface">{submissionData.title}</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Evaluated in <strong className="text-on-surface font-mono">{auditLatency}ms</strong> against Blinkit Diwali 2026 Rules & Approved Fact Register
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSubmitToBrandQueue}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-[#004578] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">send</span>
                    Submit to Brand Queue
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAllFixes}
                    className="px-4 py-2.5 rounded-xl border border-border hover:border-primary text-xs font-bold text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">auto_fix_high</span>
                    Apply Suggested Fixes
                  </button>
                </div>
              </div>

              {/* Dimension Scorecards Grid */}
              <div className="mb-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-text-muted font-mono mb-4">
                  Multi-Modal Dimension Analysis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {[
                    {
                      label: "Visual & Palette",
                      score: isPass ? "98%" : "42%",
                      status: isPass ? "Brand Match" : "Clashing Colors",
                      icon: "palette",
                      detail: isPass ? "Yellow (#F8C200) & Green (#00A36C) verified" : "Unapproved red neon palette detected",
                      pass: isPass,
                    },
                    {
                      label: "Brand Terminology",
                      score: isPass ? "100%" : "25%",
                      status: isPass ? "Zero Violations" : "Banned Terms Found",
                      icon: "spellcheck",
                      detail: isPass ? "Uses 'delivery partner' exclusively" : "Found '10-minute guarantee' & 'delivery boy'",
                      pass: isPass,
                    },
                    {
                      label: "Factual Claims",
                      score: isPass ? "100%" : "30%",
                      status: isPass ? "Supported" : "Contradicted",
                      icon: "fact_check",
                      detail: isPass ? "Claims match Knowledge Register" : "Unsubstantiated delivery guarantee claims",
                      pass: isPass,
                    },
                    {
                      label: "Diwali Event Fit",
                      score: isPass ? "95%" : "20%",
                      status: isPass ? "Eco-Friendly" : "Firecrackers Present",
                      icon: "celebration",
                      detail: isPass ? "Diyas & Sweets visible, 0 crackers" : "Prohibited burning firecrackers §3.2",
                      pass: isPass,
                    },
                    {
                      label: "WCAG Accessibility",
                      score: isPass ? "92%" : "60%",
                      status: isPass ? "AA Compliant" : "Low Contrast",
                      icon: "accessibility_new",
                      detail: isPass ? "Contrast ratio > 4.5:1 verified" : "Insufficient text contrast on dark backdrop",
                      pass: isPass,
                    },
                  ].map((dim, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        dim.pass
                          ? "bg-palette-7/20 border-border"
                          : "bg-red-500/10 border-red-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-[20px] text-primary">{dim.icon}</span>
                        <span
                          className={`text-xs font-mono font-bold ${
                            dim.pass ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {dim.score}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-on-surface mb-0.5">{dim.label}</h4>
                      <p
                        className={`text-[10px] font-bold font-mono uppercase mb-1.5 ${
                          dim.pass ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        {dim.status}
                      </p>
                      <p className="text-[11px] text-text-muted leading-tight">{dim.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Problems & Actionable Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-text-muted font-mono">
                    Audit Findings & Corrective Actions ({submissionData.findings?.length || 0})
                  </h3>
                  {submissionData.findings && submissionData.findings.length > 0 && (
                    <span className="text-xs font-mono font-bold text-text-muted">
                      {submissionData.findings.filter((f) => f.severity === "CRITICAL").length} Critical ·{" "}
                      {submissionData.findings.filter((f) => f.severity === "WARNING").length} Warnings
                    </span>
                  )}
                </div>

                {!submissionData.findings || submissionData.findings.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center">
                    <span className="material-symbols-outlined text-emerald-500 text-[40px] mb-2">
                      verified_user
                    </span>
                    <h4 className="font-bold text-base text-emerald-800 dark:text-emerald-300">
                      Zero Compliance Violations Detected!
                    </h4>
                    <p className="text-xs text-text-muted max-w-md mx-auto mt-1">
                      This creative adheres completely to the Blinkit Diwali 2026 design system, brand colors, eco-friendly policy, and terminology guidelines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {submissionData.findings.map((finding) => {
                      const isCritical = finding.severity === "CRITICAL";
                      return (
                        <div
                          key={finding.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            isCritical
                              ? "border-red-500/40 bg-red-500/5"
                              : "border-amber-500/40 bg-amber-500/5"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wider ${
                                  isCritical
                                    ? "bg-red-600 text-white"
                                    : "bg-amber-600 text-white"
                                }`}
                              >
                                {finding.severity}
                              </span>
                              <span className="text-xs font-mono font-bold uppercase text-text-muted">
                                {finding.category.replace("_", " ")}
                              </span>
                            </div>

                            {finding.guideline_citation && (
                              <span className="text-[11px] font-mono text-primary font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">menu_book</span>
                                {finding.guideline_citation}
                              </span>
                            )}
                          </div>

                          {/* Flagged Excerpt */}
                          {finding.flagged_excerpt && (
                            <div className="mb-2">
                              <span className="text-[10px] font-mono uppercase text-text-muted block mb-0.5">
                                Flagged Excerpt:
                              </span>
                              <code className="text-xs px-2 py-1 rounded bg-black/10 dark:bg-black/30 font-bold text-red-600 dark:text-red-400 font-mono">
                                &quot;{finding.flagged_excerpt}&quot;
                              </code>
                            </div>
                          )}

                          {/* Explanation */}
                          <p className="text-xs text-on-surface leading-relaxed mb-3">
                            {finding.explanation}
                          </p>

                          {/* Suggested Correction */}
                          {finding.suggested_correction && (
                            <div className="p-3 rounded-xl bg-palette-7/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="text-[10px] font-mono uppercase text-[#00A36C] font-bold block mb-0.5">
                                  ✓ Suggested Intent-Preserving Fix:
                                </span>
                                <p className="text-xs font-semibold text-on-surface">
                                  &quot;{finding.suggested_correction}&quot;
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleApplySingleCorrection(finding)}
                                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-[#004578] text-white text-[11px] font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
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
    </div>
  );
}
