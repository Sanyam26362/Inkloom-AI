"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AuditExecutionResponse, AuditFinding } from "@/lib/types";

type ContentType = "image" | "poster" | "video" | "audio" | "text";

interface JudgeSession {
  brandId: number;
  brandName: string;
  guidelinesSource: "preloaded" | "uploaded";
}

const SEVERITY_CONFIG = {
  CRITICAL: { label: "CRITICAL", badge: "bg-[var(--red)] text-white", border: "border-[var(--red)]", icon: "🔴" },
  WARNING: { label: "WARNING", badge: "bg-[var(--yellow)] text-black", border: "border-[var(--yellow)]", icon: "🟡" },
  SUGGESTION: { label: "SUGGESTION", badge: "bg-[var(--blue)] text-black", border: "border-[var(--blue)]", icon: "🔵" },
};

const CATEGORY_ICONS: Record<string, string> = {
  VISUAL: "🎨",
  EVENT_FIT: "🎯",
  TONE: "💬",
  TERMINOLOGY: "📝",
  FACTUAL_CLAIM: "📊",
  ACCESSIBILITY: "♿",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function JudgeCanvasPage() {
  const router = useRouter();
  const { brands, activeBrandId, setActiveBrandId, currentRole, theme } = useApp();
  const isDark = theme === "dark";

  useEffect(() => {
    if (currentRole === "CREATOR") {
      router.replace("/dashboard");
    }
  }, [currentRole, router]);

  const [guidelinesSource, setGuidelinesSource] = useState<"preloaded" | "uploaded">("preloaded");
  const currentBrand = brands.find((b) => b.id === activeBrandId) || brands[0];
  const session: JudgeSession | null = currentBrand
    ? {
        brandId: currentBrand.id,
        brandName: currentBrand.name,
        guidelinesSource,
      }
    : null;

  const [contentType, setContentType] = useState<ContentType>("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [campaignEvent, setCampaignEvent] = useState("Diwali 2026");
  const [contentTitle, setContentTitle] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditExecutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingGuideline, setUploadingGuideline] = useState(false);
  const [indexingPremade, setIndexingPremade] = useState(false);
  const [premadeLoadedMessage, setPremadeLoadedMessage] = useState<string | null>(null);
  const [guidelineFile, setGuidelineFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const guidelineRef = useRef<HTMLInputElement>(null);

  const handleLoadPremade = async () => {
    if (!session) return;
    setIndexingPremade(true);
    setPremadeLoadedMessage(null);
    try {
      const chunks = await api.loadPremadeGuidelines(session.brandId, { userRole: currentRole });
      setPremadeLoadedMessage(`Indexed ${chunks.length} policy chunks from backend guidelines.pdf & design.md!`);
      setGuidelinesSource("preloaded");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pre-made guidelines");
    } finally {
      setIndexingPremade(false);
    }
  };

  const loadSpiderManDemo = async () => {
    try {
      const res = await fetch("/test_spiderman.png");
      const blob = await res.blob();
      const file = new File([blob], "spiderman_diwali_poster.png", { type: "image/png" });
      setContentType("image");
      setContentTitle("Blinkit Diwali Super Hero Flash Sale");
      setCampaignEvent("Diwali 2026");
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setAuditResult(null);
      setError(null);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCompliantDemo = async () => {
    try {
      const res = await fetch("/test_diwali_compliant.png");
      const blob = await res.blob();
      const file = new File([blob], "blinkit_diwali_sweets.png", { type: "image/png" });
      setContentType("image");
      setContentTitle("Happy Diwali — Sweets in 10 Minutes");
      setCampaignEvent("Diwali 2026");
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setAuditResult(null);
      setError(null);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTextClaimsDemo = () => {
    setContentType("text");
    setContentTitle("Diwali Flash Offer Copy");
    setCampaignEvent("Diwali 2026");
    setTextContent("Order instant Diwali sweets on the app! 100% guaranteed delivery or free forever!");
    setSelectedFile(null);
    setFilePreview(null);
    setAuditResult(null);
    setError(null);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAuditResult(null);
    setError(null);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const uploadOwnGuideline = async (file: File) => {
    if (!session) return;
    setUploadingGuideline(true);
    try {
      if (file.name.endsWith(".pdf")) {
        await api.uploadGuidelinePdf(session.brandId, file, { userRole: currentRole });
      } else {
        const text = await file.text();
        const chunks = text.match(/[\s\S]{1,500}/g) || [text];
        for (const chunk of chunks) {
          await api.createGuideline({
            brand_id: session.brandId,
            content_text: chunk,
            rule_category: "DESIGN",
            source_document: file.name,
          }, { userRole: currentRole });
        }
      }
      setGuidelineFile(file);
      setGuidelinesSource("uploaded");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload guidelines");
    } finally {
      setUploadingGuideline(false);
    }
  };

  const runAudit = async () => {
    if (!session) return;
    if (contentType !== "text" && !selectedFile) {
      setError("Please select a file to audit.");
      return;
    }
    if (contentType === "text" && !textContent.trim()) {
      setError("Please enter some text content to audit.");
      return;
    }
    if (!contentTitle.trim()) {
      setError("Please enter a title for this submission.");
      return;
    }

    setIsAuditing(true);
    setError(null);
    setAuditResult(null);

    try {
      // Create a submission first
      const submission = await api.createSubmission(
        {
          brand_id: session.brandId,
          title: contentTitle,
          content_format: contentType.toUpperCase(),
          initial_content:
            contentType === "text"
              ? textContent
              : `${contentType} submission: ${selectedFile?.name || ""}`,
        },
        { userRole: currentRole }
      );

      let result: AuditExecutionResponse;
      const opts = { userRole: currentRole };
      const ev = campaignEvent || undefined;

      if (contentType === "text") {
        result = await api.auditSubmission(submission.id, opts, ev);
      } else if ((contentType === "image" || contentType === "poster") && selectedFile) {
        result = await api.uploadImage(submission.id, selectedFile, opts, ev);
      } else if (contentType === "video" && selectedFile) {
        result = await api.uploadVideo(submission.id, selectedFile, opts, ev);
      } else if (contentType === "audio" && selectedFile) {
        result = await api.uploadAudio(submission.id, selectedFile, opts, ev);
      } else {
        throw new Error("Unsupported content type");
      }

      setAuditResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setIsAuditing(false);
    }
  };

  const CONTENT_TYPES: { id: ContentType; label: string; icon: string; accept: string; desc: string }[] = [
    { id: "image", label: "Instagram Post", icon: "📱", accept: "image/*", desc: "JPG, PNG, WEBP" },
    { id: "poster", label: "Poster / Banner", icon: "🖼️", accept: "image/*", desc: "JPG, PNG, WEBP" },
    { id: "video", label: "Video Ad", icon: "🎬", accept: "video/*", desc: "MP4, MOV, WEBM" },
    { id: "audio", label: "Audio Ad", icon: "🎵", accept: "audio/*", desc: "MP3, WAV, M4A" },
    { id: "text", label: "Copy / Caption", icon: "📝", accept: "", desc: "Text content" },
  ];

  return (
    <div className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className={`p-5 sm:p-6 border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 border-3 border-black bg-[var(--yellow)] flex items-center justify-center text-2xl shadow-[3px_3px_0px_#000] shrink-0">
              ⚖️
            </div>
            <div>
              <div className="inline-block px-2 py-0.5 border border-black bg-[var(--blue)] text-[var(--ink)] text-[10px] font-mono font-black uppercase tracking-wider mb-1 shadow-[1px_1px_0px_#000]">
                EVALUATION BENCHMARK
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-archivo tracking-tight uppercase">
                Judge Canvas // AI Governance Studio
              </h1>
              <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] mt-0.5">
                Multi-Modal Brand Policy Ingestion, Grounded Rule Auditing &amp; Real-time Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 border-2 border-black bg-[var(--pink)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000]">
              ROLE: {currentRole}
            </span>
          </div>
        </div>

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Upload + Settings (5 cols) */}
          <div className="lg:col-span-5 space-y-5">

            {/* Panel 1: Brand & Guidelines Selection */}
            <div className={`p-4 sm:p-5 border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} space-y-4`}>
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[var(--ink)] dark:text-white flex items-center gap-2 border-b-2 border-black pb-2">
                <span>🏢</span> BRAND &amp; GUIDELINES CONFIGURATION
              </h3>

              {/* Active Brand Selector */}
              <div>
                <label className="text-[11px] font-mono font-black uppercase text-[#555] dark:text-[#888] block mb-1">
                  Active Brand Entity
                </label>
                <select
                  value={activeBrandId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setActiveBrandId(id);
                    setGuidelinesSource("preloaded");
                  }}
                  className={`w-full px-3 py-2 border-2 border-black font-mono font-bold text-xs ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"} shadow-[3px_3px_0px_#000] focus:outline-none cursor-pointer`}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name.toUpperCase()} (ID: {b.id})</option>
                  ))}
                </select>
              </div>

              {/* Guidelines Source Options */}
              <div className="space-y-3">
                <label className="text-[11px] font-mono font-black uppercase text-[#555] dark:text-[#888] block">
                  Guidelines Source
                </label>

                {/* Pre-loaded Guidelines Card */}
                <div
                  className={`p-3.5 border-3 transition-all ${
                    session?.guidelinesSource === "preloaded"
                      ? "border-black bg-[var(--green)]/20 shadow-[3px_3px_0px_#000]"
                      : "border-black/40 hover:border-black bg-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">✅</span>
                      <div>
                        <p className="text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                          Pre-loaded Brand Guidelines
                        </p>
                        <p className="text-[11px] font-mono text-[#555] dark:text-[#a0a5b5]">
                          Blinkit Diwali 2026 guidelines &amp; design system
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadPremade}
                      disabled={indexingPremade}
                      className="px-3 py-1.5 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
                    >
                      {indexingPremade ? "Syncing..." : "⚡ Sync Premade"}
                    </button>
                  </div>

                  {premadeLoadedMessage && (
                    <div className="mt-2.5 text-[11px] font-mono font-bold text-[var(--ink)] bg-[var(--green)] border-2 border-black p-2 shadow-[2px_2px_0px_#000]">
                      ✓ {premadeLoadedMessage}
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t-2 border-black/20 flex items-center gap-3 text-[11px] font-mono font-bold">
                    <a
                      href="/blinkit_guidelines.pdf"
                      download="blinkit_guidelines.pdf"
                      className="underline hover:opacity-80 flex items-center gap-1"
                    >
                      📥 Guidelines.pdf
                    </a>
                    <span>·</span>
                    <a
                      href="/blinkit_design.md"
                      download="blinkit_design.md"
                      className="underline hover:opacity-80 flex items-center gap-1"
                    >
                      📥 Design.md
                    </a>
                  </div>
                </div>

                {/* Upload Custom Guidelines */}
                <div className="border-3 border-black p-3.5 shadow-[2px_2px_0px_#000] bg-white dark:bg-[#1c1d22]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">📂</span>
                    <div>
                      <p className="text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                        Upload Custom Guidelines
                      </p>
                      <p className="text-[11px] font-mono text-[#555] dark:text-[#a0a5b5]">
                        Upload custom brand PDF or markdown ruleset
                      </p>
                    </div>
                  </div>
                  <input
                    ref={guidelineRef}
                    type="file"
                    accept=".pdf,.md,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadOwnGuideline(f);
                    }}
                  />
                  <button
                    onClick={() => guidelineRef.current?.click()}
                    disabled={uploadingGuideline}
                    className="w-full py-2 px-3 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingGuideline ? "Uploading..." : guidelineFile ? `✓ ${guidelineFile.name}` : "Choose Custom File"}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel 2: Campaign Event */}
            <div className={`p-4 sm:p-5 border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} space-y-2`}>
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[var(--ink)] dark:text-white flex items-center gap-2 border-b-2 border-black pb-2">
                <span>🗓️</span> TARGET CAMPAIGN EVENT
              </h3>
              <input
                type="text"
                value={campaignEvent}
                onChange={(e) => setCampaignEvent(e.target.value)}
                placeholder="e.g. Diwali 2026, Holi, Summer Flash Sale"
                className={`w-full px-3 py-2 border-2 border-black font-mono font-bold text-xs ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"} shadow-[3px_3px_0px_#000] focus:outline-none`}
              />
              <p className="text-[10px] font-mono text-[#555] dark:text-[#888]">
                Multimodal content will be evaluated for relevance &amp; festival compliance against this event context.
              </p>
            </div>

            {/* Panel 3: Content Type Grid */}
            <div className={`p-4 sm:p-5 border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} space-y-3`}>
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[var(--ink)] dark:text-white flex items-center gap-2 border-b-2 border-black pb-2">
                <span>📁</span> ASSET FORMAT &amp; MEDIUM
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => {
                      setContentType(ct.id);
                      setSelectedFile(null);
                      setFilePreview(null);
                      setAuditResult(null);
                    }}
                    className={`p-2.5 border-2 border-black text-center transition-all cursor-pointer ${
                      contentType === ct.id
                        ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                        : "bg-white dark:bg-[#1c1d22] text-black dark:text-white shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                    }`}
                  >
                    <div className="text-xl mb-1">{ct.icon}</div>
                    <p className="text-[11px] font-mono font-black uppercase truncate">{ct.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel 4: Quick Test Presets (FOR JUDGES) */}
            <div className={`p-4 sm:p-5 border-4 border-black bg-[var(--blue)]/20 shadow-[6px_6px_0px_#000] space-y-3`}>
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  🧪 HACKATHON BENCHMARK PRESETS (1-CLICK)
                </span>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 border border-black bg-[var(--yellow)] text-black shadow-[1px_1px_0px_#000]">
                  FOR JUDGES
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#333] dark:text-[#c9d1d9]">
                Click any benchmark sample below to instantly load test assets and execute verification:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={loadSpiderManDemo}
                  className="p-2.5 border-2 border-black bg-[var(--red)]/15 hover:bg-[var(--red)]/25 text-left transition-all shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase text-[var(--red)] dark:text-[#ff7b72]">
                    <span>🕷️</span> Spider-Man Superhero Violation
                  </div>
                  <p className="text-[10px] font-mono text-[#444] dark:text-[#a0a5b5] mt-0.5">
                    Prohibited off-brand superhero IP (Triggers CRITICAL finding)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={loadCompliantDemo}
                  className="p-2.5 border-2 border-black bg-[var(--green)]/25 hover:bg-[var(--green)]/35 text-left transition-all shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-[#b9f4a8]">
                    <span>🪔</span> Festive Diwali Sweets Creative
                  </div>
                  <p className="text-[10px] font-mono text-[#444] dark:text-[#a0a5b5] mt-0.5">
                    Verified brand color palette &amp; festive cues (100% Compliant)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={loadTextClaimsDemo}
                  className="p-2.5 border-2 border-black bg-[var(--yellow)]/30 hover:bg-[var(--yellow)]/45 text-left transition-all shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase text-black dark:text-[#ffdb1f]">
                    <span>📝</span> Prohibited Copy &amp; Claims Test
                  </div>
                  <p className="text-[10px] font-mono text-[#444] dark:text-[#a0a5b5] mt-0.5">
                    Flags unverified superlatives (&quot;guaranteed&quot;, &quot;instant&quot;, &quot;app&quot;)
                  </p>
                </button>
              </div>
            </div>

            {/* Panel 5: Content Upload & Title Input */}
            <div className={`p-4 sm:p-5 border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} space-y-3`}>
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-[var(--ink)] dark:text-white flex items-center gap-2 border-b-2 border-black pb-2">
                <span>📤</span> SUBMISSION ASSET DETAILS
              </h3>

              <div>
                <label className="text-[11px] font-mono font-black uppercase text-[#555] dark:text-[#888] block mb-1">
                  Asset Title
                </label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder={`e.g. Blinkit ${campaignEvent} Promotion`}
                  className={`w-full px-3 py-2 border-2 border-black font-mono font-bold text-xs ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"} shadow-[3px_3px_0px_#000] focus:outline-none`}
                />
              </div>

              {contentType === "text" ? (
                <div>
                  <label className="text-[11px] font-mono font-black uppercase text-[#555] dark:text-[#888] block mb-1">
                    Text Copy / Ad Script
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter your promotional caption, product claims, or ad scripts here..."
                    rows={5}
                    className={`w-full p-3 border-2 border-black font-mono text-xs ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"} shadow-[3px_3px_0px_#000] focus:outline-none resize-none leading-relaxed`}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-mono font-black uppercase text-[#555] dark:text-[#888] block mb-1">
                    Media File Payload
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-3 border-dashed border-black p-5 text-center cursor-pointer transition-all shadow-[2px_2px_0px_#000] ${
                      isDark ? "bg-[#141518] hover:bg-[#1c1d22]" : "bg-[var(--paper)] hover:bg-white"
                    }`}
                  >
                    {filePreview ? (
                      <div className="border-2 border-black p-2 bg-white inline-block">
                        <img src={filePreview} alt="Preview" className="max-h-36 mx-auto object-contain" />
                      </div>
                    ) : selectedFile ? (
                      <div>
                        <div className="text-3xl mb-1">
                          {CONTENT_TYPES.find((ct) => ct.id === contentType)?.icon}
                        </div>
                        <p className="text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] font-mono text-[#555] dark:text-[#888]">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-1">
                          {CONTENT_TYPES.find((ct) => ct.id === contentType)?.icon}
                        </div>
                        <p className="text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                          DROP FILE OR CLICK TO UPLOAD
                        </p>
                        <p className="text-[10px] font-mono text-[#555] dark:text-[#888] mt-1">
                          {CONTENT_TYPES.find((ct) => ct.id === contentType)?.desc}
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept={CONTENT_TYPES.find((ct) => ct.id === contentType)?.accept}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={runAudit}
              disabled={isAuditing || !session}
              className="w-full py-4 border-4 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-[var(--ink)] font-archivo font-black text-base sm:text-lg uppercase tracking-tight shadow-[6px_6px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_#000] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
            >
              {isAuditing ? (
                <>
                  <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                  <span>RUNNING AI GOVERNANCE AUDIT...</span>
                </>
              ) : (
                <>
                  <span>⚖️ JUDGE THIS CONTENT</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT PANEL: Results (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Empty State */}
            {!auditResult && !error && !isAuditing && (
              <div className={`border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} p-10 text-center flex flex-col items-center`}>
                <div className="w-16 h-16 border-3 border-black bg-[var(--yellow)] flex items-center justify-center text-3xl shadow-[4px_4px_0px_#000] mb-4">
                  🤖
                </div>
                <h3 className="text-xl font-archivo font-black uppercase text-[var(--ink)] dark:text-white mb-2">
                  Ready to Evaluate Content
                </h3>
                <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-md leading-relaxed">
                  Configure submission asset details on the left or select a 1-click test preset to initiate multi-modal AI brand governance against {session?.brandName || "Brand"} policies.
                </p>
                {campaignEvent && (
                  <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 border-2 border-black bg-[var(--yellow)]/30 text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000]">
                    🗓️ EVALUATING FOR CONTEXT: {campaignEvent}
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {isAuditing && (
              <div className={`border-4 border-black ${isDark ? "bg-[#18191f]" : "bg-[var(--white)]"} shadow-[6px_6px_0px_#000] p-10 text-center flex flex-col items-center`}>
                <div className="relative inline-flex mb-4">
                  <div className="w-16 h-16 border-4 border-black border-t-[var(--yellow)] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
                </div>
                <h3 className="text-xl font-archivo font-black uppercase text-[var(--ink)] dark:text-white mb-2">
                  Analysing Content Multimodality...
                </h3>
                <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5]">
                  Google Gemini 2.5 Flash is inspecting visual cues, text claims, and audio tone against {session?.brandName} brand guidelines.
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="border-4 border-black bg-[var(--red)] text-white shadow-[6px_6px_0px_#000] p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <h3 className="font-archivo font-black text-base uppercase">Audit Execution Failed</h3>
                    <p className="text-xs font-mono mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Result State */}
            {auditResult && (
              <div className="space-y-5">
                {/* Score & Index Card */}
                <div className={`border-4 border-black p-6 shadow-[6px_6px_0px_#000] ${
                  auditResult.compliance_score >= 90
                    ? "bg-[var(--green)]/20"
                    : auditResult.compliance_score >= 70
                    ? "bg-[var(--yellow)]/20"
                    : "bg-[var(--red)]/20"
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono font-black uppercase tracking-wider text-[#555] dark:text-[#a0a5b5]">
                        COMPLIANCE EVALUATION SCORE
                      </p>
                      <div className="text-5xl font-archivo font-black mt-1 text-[var(--ink)] dark:text-white">
                        {auditResult.compliance_score.toFixed(1)}%
                      </div>
                      <p className="text-xs font-mono font-bold mt-1 text-[#333] dark:text-[#c9d1d9]">
                        {auditResult.total_findings} FINDINGS LOGGED · STATUS: {auditResult.status.replace("_", " ").toUpperCase()}
                      </p>
                    </div>

                    <div className="w-16 h-16 border-3 border-black bg-white flex items-center justify-center text-3xl shadow-[3px_3px_0px_#000]">
                      {auditResult.compliance_score >= 90 ? "✅" : auditResult.compliance_score >= 70 ? "⚠️" : "🚫"}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-4 bg-black/20 border-2 border-black overflow-hidden">
                    <div
                      className={`h-full border-r-2 border-black transition-all duration-1000 ${
                        auditResult.compliance_score >= 90
                          ? "bg-[var(--green)]"
                          : auditResult.compliance_score >= 70
                          ? "bg-[var(--yellow)]"
                          : "bg-[var(--red)]"
                      }`}
                      style={{ width: `${auditResult.compliance_score}%` }}
                    />
                  </div>

                  {/* Severity Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {Object.entries(auditResult.findings_by_severity).map(([sev, count]) => {
                      const cfg = SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.WARNING;
                      return (
                        <div key={sev} className={`p-2.5 border-2 border-black text-center shadow-[2px_2px_0px_#000] ${cfg.badge}`}>
                          <div className="text-xl font-mono font-black">{count}</div>
                          <div className="text-[10px] font-mono font-black uppercase tracking-wider">{cfg.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Findings List */}
                {auditResult.findings && auditResult.findings.length > 0 && (
                  <div className={`border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} p-5`}>
                    <h3 className="font-archivo font-black text-sm uppercase tracking-tight text-[var(--ink)] dark:text-white mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                      🔍 AUDIT FINDINGS &amp; DETECTOR CITATIONS
                    </h3>

                    <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                      {auditResult.findings.map((finding: AuditFinding, idx: number) => {
                        const sev = finding.severity as keyof typeof SEVERITY_CONFIG;
                        const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.WARNING;
                        return (
                          <div
                            key={finding.id || idx}
                            className={`p-4 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-white"} shadow-[3px_3px_0px_#000] space-y-2`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 border border-black uppercase shadow-[1px_1px_0px_#000] ${cfg.badge}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-xs font-mono font-bold flex items-center gap-1">
                                  {CATEGORY_ICONS[finding.category] || "📋"}
                                  {finding.category}
                                </span>
                              </div>
                              {finding.detector_source && (
                                <span className="text-[10px] font-mono text-[#666] dark:text-[#999] uppercase">
                                  SRC: {finding.detector_source}
                                </span>
                              )}
                            </div>

                            {finding.flagged_excerpt && (
                              <div className="p-2 border-2 border-black bg-[var(--red)]/10 text-xs font-mono font-bold text-[var(--red)] dark:text-[#ff7b72]">
                                Flagged: “{finding.flagged_excerpt}”
                              </div>
                            )}

                            <p className="text-xs font-mono leading-relaxed text-[#333] dark:text-[#c9d1d9]">
                              {finding.explanation}
                            </p>

                            {finding.suggested_correction && (
                              <div className="p-2 border-2 border-black bg-[var(--green)]/20 text-xs font-mono">
                                <p className="text-[10px] font-black uppercase text-[var(--ink)] dark:text-white mb-0.5">
                                  💡 APPROVED SUGGESTION:
                                </p>
                                <p className="font-bold text-[var(--ink)] dark:text-[#b9f4a8]">
                                  “{finding.suggested_correction}”
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Clear Card */}
                {(!auditResult.findings || auditResult.findings.length === 0) && (
                  <div className="border-4 border-black bg-[var(--green)] text-[var(--ink)] p-8 text-center shadow-[6px_6px_0px_#000]">
                    <div className="text-5xl mb-2">✅</div>
                    <h3 className="font-archivo font-black text-xl uppercase">All Clear — Fully Compliant!</h3>
                    <p className="text-xs font-mono font-bold mt-1">
                      No brand governance violations detected. Content strictly adheres to {session?.brandName} brand guidelines.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
