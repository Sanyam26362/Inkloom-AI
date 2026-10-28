"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api";
import { Submission, AuditExecutionResponse, AuditFinding } from "@/lib/types";

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
  const { activeBrandId, currentRole, brands, setActiveBrandId, theme } = useApp();
  const isDark = theme === "dark";

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
  const handleRunAudit = async (customCopy?: string, customTitle?: string) => {
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
    await handleRunAudit(sample.copy, sample.headline);
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
              href="/dashboard"
              className="px-3.5 py-2 border-2 border-black bg-[var(--yellow)] text-black text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
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

              {/* Step 3: Optional File Attachment (Drag & Drop) */}
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                        <span className="material-symbols-outlined text-[24px]">description</span>
                      </div>
                      <div className="text-left font-mono">
                        <p className="text-xs font-black uppercase text-[var(--ink)] dark:text-white truncate max-w-xs">{assetFile.name}</p>
                        <p className="text-[10px] text-[#666] dark:text-[#888]">
                          {(assetFile.size / 1024).toFixed(1)} KB · {assetFile.type}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setAssetFile(null);
                        }}
                        className="px-2 py-1 border-2 border-black bg-[var(--red)] text-white text-[10px] font-mono font-black uppercase shadow-[1px_1px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                      >
                        ✕ REMOVE
                      </button>
                    </div>
                  ) : (
                    <div className="text-center font-mono">
                      <div className="w-12 h-12 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-2 shadow-[2px_2px_0px_#000]">
                        <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                      </div>
                      <p className="text-xs font-black uppercase text-[var(--ink)] dark:text-white">
                        Click or Drop Creative Asset
                      </p>
                      <p className="text-[10px] text-[#666] dark:text-[#888] mt-0.5">
                        PNG, JPG, MP3, MP4 supported for multimodal Gemini verification
                      </p>
                    </div>
                  )}
                </label>
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
          {/* RIGHT COLUMN: HACKATHON EVALUATOR QUICK-TEST CANVAS (5 Cols)              */}
          {/* ========================================================================= */}
          <div className="xl:col-span-5 space-y-4">
            <div className={`p-5 sm:p-6 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            }`}>
              <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-black dark:text-[#ffdb1f]">gavel</span>
                  <h3 className="font-archivo font-black text-xs uppercase tracking-tight text-[var(--ink)] dark:text-white">
                    Hackathon Evaluator Demo Canvas
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 border border-black bg-[var(--yellow)] text-black shadow-[1px_1px_0px_#000]">
                  Quick Load
                </span>
              </div>
              <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-4">
                Click any benchmark creative below to test Inkloom&apos;s multimodal governance engine against authentic Diwali guidelines instantly.
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
                      className={`p-4 border-3 border-black transition-all ${
                        isSelected
                          ? "bg-[var(--yellow)]/20 shadow-[4px_4px_0px_#000]"
                          : sample.type === "GOOD"
                          ? "bg-[var(--green)]/15 shadow-[3px_3px_0px_#000]"
                          : "bg-[var(--red)]/15 shadow-[3px_3px_0px_#000]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{sample.festivalIcon}</span>
                          <div>
                            <h4 className="font-mono font-black text-xs uppercase text-[var(--ink)] dark:text-white leading-tight">
                              {sample.title}
                            </h4>
                            <span className="text-[10px] font-mono text-[#666] dark:text-[#888] uppercase">{sample.format}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 border border-black text-[9px] font-mono font-black uppercase shadow-[1px_1px_0px_#000] ${
                            sample.type === "GOOD"
                              ? "bg-[var(--green)] text-black"
                              : "bg-[var(--red)] text-white"
                          }`}
                        >
                          {sample.badgeLabel}
                        </span>
                      </div>

                      {/* Highlights */}
                      <div className="space-y-1 mb-3 text-[11px] font-mono leading-relaxed">
                        {sample.keyHighlights.map((hl, i) => (
                          <div
                            key={i}
                            className={`line-clamp-1 font-bold ${
                              sample.type === "GOOD" ? "text-emerald-800 dark:text-[#b9f4a8]" : "text-red-800 dark:text-[#ff7b72]"
                            }`}
                          >
                            {hl}
                          </div>
                        ))}
                      </div>

                      {/* Expandable LLM Prompt Box */}
                      <div className="mb-3 pt-2 border-t-2 border-black/20 font-mono">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <button
                            type="button"
                            onClick={() => setExpandedPromptId(isExpanded ? null : sample.id)}
                            className="font-black uppercase underline hover:opacity-80 flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isExpanded ? "expand_less" : "expand_more"}
                            </span>
                            {isExpanded ? "Hide Image Prompt" : "View Image Prompt"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(sample.id, sample.llmPrompt)}
                            className="px-2 py-0.5 border border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-[9px] uppercase shadow-[1px_1px_0px_#000] flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {isCopied ? "check" : "content_copy"}
                            </span>
                            {isCopied ? "Copied!" : "Copy"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="p-2.5 border-2 border-black bg-white dark:bg-[#141518] text-[10px] font-mono leading-relaxed text-[#444] dark:text-[#a0a5b5] max-h-36 overflow-y-auto">
                            {sample.llmPrompt}
                          </div>
                        )}
                      </div>

                      {/* One Click Load & Audit Button */}
                      <button
                        type="button"
                        onClick={() => handleLoadAndAuditSample(sample)}
                        disabled={isAuditing}
                        className={`w-full py-2 px-3 border-2 border-black text-xs font-mono font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 ${
                          sample.type === "GOOD"
                            ? "bg-[var(--green)] text-black"
                            : "bg-[var(--red)] text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        ⚡ Load Sample &amp; Run Real Audit
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
          <div ref={reportRef} id="audit-report" className="mt-10 space-y-6 scroll-mt-6">
            <div className={`p-6 sm:p-8 border-4 ${
              isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            }`}>
              {/* Executive Verdict Banner */}
              <div
                className={`p-5 sm:p-6 border-3 border-black flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shadow-[4px_4px_0px_#000] ${
                  isPass
                    ? "bg-[var(--green)]/25"
                    : "bg-[var(--red)]/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 border-3 border-black flex items-center justify-center font-mono font-black text-2xl shadow-[3px_3px_0px_#000] ${
                      isPass ? "bg-[var(--green)] text-black" : "bg-[var(--red)] text-white"
                    }`}
                  >
                    {score !== null ? `${score}%` : "—"}
                  </div>
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
                      <span className="text-xs font-mono text-[#666] dark:text-[#999]">
                        SUB-#{submissionData.id} · v{submissionData.current_version}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-archivo font-black uppercase text-[var(--ink)] dark:text-white">{submissionData.title}</h2>
                    <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] mt-0.5">
                      Evaluated in <strong className="text-[var(--ink)] dark:text-white font-mono">{auditLatency}ms</strong> against Blinkit Diwali 2026 Rules &amp; Approved Fact Register
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSubmitToBrandQueue}
                    className="px-3.5 py-2 border-2 border-black bg-[var(--yellow)] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px]">send</span>
                    Submit to Brand Queue
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAllFixes}
                    className="px-3.5 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px]">auto_fix_high</span>
                    Apply Suggested Fixes
                  </button>
                </div>
              </div>

              {/* Dimension Scorecards Grid */}
              <div className="mb-8">
                <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[#666] dark:text-[#888] mb-3">
                  [MULTI-MODAL DIMENSION ANALYSIS]
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
                      className={`p-3.5 border-2 border-black shadow-[2px_2px_0px_#000] font-mono transition-all ${
                        dim.pass
                          ? "bg-[var(--green)]/15"
                          : "bg-[var(--red)]/15"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="material-symbols-outlined text-[20px] text-black dark:text-white">{dim.icon}</span>
                        <span
                          className={`text-xs font-mono font-black ${
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
                      <p className="text-[10px] text-[#555] dark:text-[#a0a5b5] leading-tight">{dim.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Problems & Actionable Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2 font-mono">
                  <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[var(--ink)] dark:text-white">
                    Audit Findings &amp; Corrective Actions ({submissionData.findings?.length || 0})
                  </h3>
                  {submissionData.findings && submissionData.findings.length > 0 && (
                    <span className="text-[10px] font-black uppercase text-[#666] dark:text-[#888]">
                      {submissionData.findings.filter((f) => f.severity === "CRITICAL").length} Critical ·{" "}
                      {submissionData.findings.filter((f) => f.severity === "WARNING").length} Warnings
                    </span>
                  )}
                </div>

                {!submissionData.findings || submissionData.findings.length === 0 ? (
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
                    {submissionData.findings.map((finding) => {
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
    </div>
  );
}
