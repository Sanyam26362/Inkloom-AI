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
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200", icon: "🔴", dot: "bg-red-500" },
  WARNING: { label: "Warning", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "🟡", dot: "bg-amber-500" },
  SUGGESTION: { label: "Suggestion", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "🔵", dot: "bg-blue-500" },
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
  const { brands, activeBrandId, setActiveBrandId, currentRole } = useApp();

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

  const complianceColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const complianceBg = (score: number) => {
    if (score >= 90) return "bg-emerald-50 border-emerald-200";
    if (score >= 70) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const CONTENT_TYPES: { id: ContentType; label: string; icon: string; accept: string; desc: string }[] = [
    { id: "image", label: "Instagram Post", icon: "📱", accept: "image/*", desc: "JPG, PNG, WEBP" },
    { id: "poster", label: "Poster / Banner", icon: "🖼️", accept: "image/*", desc: "JPG, PNG, WEBP" },
    { id: "video", label: "Video Ad", icon: "🎬", accept: "video/*", desc: "MP4, MOV, WEBM" },
    { id: "audio", label: "Audio Ad", icon: "🎵", accept: "audio/*", desc: "MP3, WAV, M4A" },
    { id: "text", label: "Copy / Caption", icon: "📝", accept: "", desc: "Text content" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg">
              ⚖️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Judge Canvas</h1>
              <p className="text-slate-500 text-sm">AI-powered brand governance evaluation</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANEL: Upload + Settings */}
          <div className="lg:col-span-5 space-y-4">

            {/* Brand & Guidelines Selection */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                🏢 Brand & Guidelines
              </h3>

              {/* Brand Selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Active Brand</label>
                <select
                  value={activeBrandId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setActiveBrandId(id);
                    setGuidelinesSource("preloaded");
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Guidelines Options */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-500 block">Guidelines Source</label>
                <div
                  className={`p-3.5 rounded-xl border-2 transition-all ${
                    session?.guidelinesSource === "preloaded"
                      ? "border-emerald-400 bg-emerald-50/60"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">✅</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Pre-loaded Guidelines</p>
                        <p className="text-xs text-slate-500">Blinkit Diwali 2026 guidelines & design system</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadPremade}
                      disabled={indexingPremade}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                    >
                      {indexingPremade ? "Indexing..." : "⚡ Sync Premade"}
                    </button>
                  </div>

                  {premadeLoadedMessage && (
                    <div className="mt-2 text-[11px] font-medium text-emerald-700 bg-emerald-100/70 p-1.5 rounded-md">
                      ✓ {premadeLoadedMessage}
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-3 text-xs">
                    <a
                      href="/blinkit_guidelines.pdf"
                      download="blinkit_guidelines.pdf"
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium flex items-center gap-1"
                    >
                      📥 Download guidelines.pdf
                    </a>
                    <span className="text-slate-300">·</span>
                    <a
                      href="/blinkit_design.md"
                      download="blinkit_design.md"
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium flex items-center gap-1"
                    >
                      📥 Download design.md
                    </a>
                  </div>
                </div>

                <div className="border-2 border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">📂</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Upload Your Own Guidelines</p>
                      <p className="text-xs text-slate-500">Upload a custom brand guidelines PDF or markdown</p>
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
                    className="w-full py-2 px-4 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    {uploadingGuideline ? "Uploading..." : guidelineFile ? `✓ ${guidelineFile.name}` : "Choose Custom File"}
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Event */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                🗓️ Campaign Event
              </h3>
              <input
                type="text"
                value={campaignEvent}
                onChange={(e) => setCampaignEvent(e.target.value)}
                placeholder="e.g. Diwali 2024, Holi, Summer Sale"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Content will be checked for relevance to this event
              </p>
            </div>

            {/* Content Type */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                📁 Content Type
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
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                      contentType === ct.id
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-2xl">{ct.icon}</div>
                    <p className="text-xs font-semibold text-slate-700 mt-1">{ct.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Test Presets for Judges */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-amber-50 border border-indigo-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  🧪 Hackathon Demo Presets (1-Click Test)
                </span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  FOR JUDGES
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mb-3">
                Click any sample to auto-load test assets and evaluate AI governance in real-time:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={loadSpiderManDemo}
                  className="p-2 bg-white hover:bg-red-50 border border-red-200 rounded-xl text-left transition-all group shadow-2xs hover:border-red-300"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                    <span>🕷️</span> Spider-Man Test
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 group-hover:text-red-600">
                    Prohibited superhero off-brand violation (triggers CRITICAL)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={loadCompliantDemo}
                  className="p-2 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl text-left transition-all group shadow-2xs hover:border-emerald-300"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <span>🪔</span> Diwali Sweets Test
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 group-hover:text-emerald-600">
                    Approved brand palette &amp; festive cues (compliant)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={loadTextClaimsDemo}
                  className="p-2 bg-white hover:bg-amber-50 border border-amber-200 rounded-xl text-left transition-all group shadow-2xs hover:border-amber-300"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <span>📝</span> Prohibited Copy Test
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 group-hover:text-amber-600">
                    Flags &quot;guaranteed&quot;, &quot;instant&quot; &amp; standalone &quot;app&quot;
                  </p>
                </button>
              </div>
            </div>

            {/* Content Upload */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                📤 Upload Content
              </h3>

              <div className="mb-3">
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Title</label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder={`e.g. Blinkit ${campaignEvent} Post`}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {contentType === "text" ? (
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter your caption, copy, or text content here..."
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all"
                >
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                  ) : selectedFile ? (
                    <div>
                      <div className="text-3xl mb-2">
                        {CONTENT_TYPES.find((ct) => ct.id === contentType)?.icon}
                      </div>
                      <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">{formatBytes(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">
                        {CONTENT_TYPES.find((ct) => ct.id === contentType)?.icon}
                      </div>
                      <p className="text-sm text-slate-500">Drop file or click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">
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
              )}
            </div>

            {/* Audit Button */}
            <button
              onClick={runAudit}
              disabled={isAuditing || !session}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              {isAuditing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                  Running AI Audit...
                </>
              ) : (
                <>
                  ⚖️ Judge This Content
                </>
              )}
            </button>
          </div>

          {/* RIGHT PANEL: Results */}
          <div className="lg:col-span-7 space-y-4">
            {!auditResult && !error && !isAuditing && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Judge</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Upload content and click &quot;Judge This Content&quot; to run an AI-powered brand
                  governance audit against {session?.brandName || "brand"} guidelines.
                </p>
                {campaignEvent && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-700 font-medium">
                    🗓️ Evaluating for: <strong>{campaignEvent}</strong>
                  </div>
                )}
              </div>
            )}

            {isAuditing && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <div className="relative inline-flex mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Analysing Content...</h3>
                <p className="text-slate-500 text-sm">
                  Gemini AI is reviewing your content against {session?.brandName} brand guidelines
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <h3 className="font-bold text-red-800">Audit Failed</h3>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {auditResult && (
              <>
                {/* Score Card */}
                <div className={`rounded-2xl border p-6 shadow-sm ${complianceBg(auditResult.compliance_score)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Compliance Score</p>
                      <div className={`text-5xl font-bold font-mono ${complianceColor(auditResult.compliance_score)}`}>
                        {auditResult.compliance_score.toFixed(1)}%
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {auditResult.total_findings} findings · {auditResult.status.replace("_", " ")}
                      </p>
                    </div>
                    <div className="text-6xl">
                      {auditResult.compliance_score >= 90 ? "✅" : auditResult.compliance_score >= 70 ? "⚠️" : "🚫"}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-2.5 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        auditResult.compliance_score >= 90
                          ? "bg-emerald-500"
                          : auditResult.compliance_score >= 70
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${auditResult.compliance_score}%` }}
                    />
                  </div>

                  {/* Severity breakdown */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {Object.entries(auditResult.findings_by_severity).map(([sev, count]) => {
                      const cfg = SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG];
                      return (
                        <div key={sev} className={`p-2.5 rounded-xl border text-center ${cfg.color}`}>
                          <div className="text-xl font-bold">{count}</div>
                          <div className="text-[11px] font-semibold">{cfg.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Findings */}
                {auditResult.findings && auditResult.findings.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      🔍 Audit Findings
                    </h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {auditResult.findings.map((finding: AuditFinding, idx: number) => {
                        const sev = finding.severity as keyof typeof SEVERITY_CONFIG;
                        const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.WARNING;
                        return (
                          <div key={finding.id || idx} className={`p-4 rounded-xl border ${cfg.color}`}>
                            <div className="flex items-start gap-3">
                              <span className="text-lg shrink-0 mt-0.5">{cfg.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${cfg.color}`}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    {CATEGORY_ICONS[finding.category] || "📋"}
                                    {finding.category}
                                  </span>
                                  {finding.detector_source && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {finding.detector_source}
                                    </span>
                                  )}
                                </div>
                                {finding.flagged_excerpt && (
                                  <div className="mb-1">
                                    <span className="text-xs text-slate-400">Flagged: </span>
                                    <code className="text-xs bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                                      {finding.flagged_excerpt}
                                    </code>
                                  </div>
                                )}
                                <p className="text-xs text-slate-700 leading-relaxed">{finding.explanation}</p>
                                {finding.suggested_correction && (
                                  <div className="mt-2 p-2 bg-white/60 rounded-lg border border-current/20">
                                    <p className="text-[11px] font-semibold text-slate-600 mb-0.5">💡 Suggestion:</p>
                                    <p className="text-xs text-slate-600">{finding.suggested_correction}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No findings */}
                {(!auditResult.findings || auditResult.findings.length === 0) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center shadow-sm">
                    <div className="text-5xl mb-3">✅</div>
                    <h3 className="font-bold text-emerald-800 text-lg">All Clear!</h3>
                    <p className="text-emerald-600 text-sm mt-1">
                      No brand governance violations detected. Content is compliant with {session?.brandName} guidelines.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
