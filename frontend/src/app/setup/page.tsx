"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { BrandProfile } from "@/lib/types";

// ── Brand catalogue (prototype) ───────────────────────────────────────────────
const BRAND_CATALOGUE = [
  {
    id: "blinkit",
    name: "Blinkit",
    industry: "Quick Commerce / Grocery Delivery",
    tagline: "Grocery delivery in 10 minutes",
    logo: "🟡",
    primaryColor: "#F8C200",
    secondaryColor: "#1C1C1E",
    description:
      "India's fastest grocery delivery platform. Blinkit (formerly Grofers) delivers groceries and daily essentials in under 10 minutes.",
    tone: "Energetic, friendly, quick, trustworthy. Speaks directly to everyday Indian consumers. Avoids jargon.",
    palette: ["#F8C200", "#1C1C1E", "#FFFFFF", "#0C831F", "#F5F5F5"],
    bannedTerms: ["fake", "fraud", "scam", "cheap quality", "spy", "hack", "explicit"],
    isDemo: true,
  },
  {
    id: "custom",
    name: "Your Brand",
    industry: "Custom",
    tagline: "Configure your own brand",
    logo: "⚙️",
    primaryColor: "#6366f1",
    secondaryColor: "#1e1b4b",
    description: "Set up a custom brand profile with your own guidelines and design system.",
    tone: "Professional, clear, and on-brand.",
    palette: [],
    bannedTerms: [],
    isDemo: false,
  },
];

type Step = "select-brand" | "upload-docs" | "configure" | "done";

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  type: "pdf" | "markdown" | "event" | "other";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SetupPage() {
  const router = useRouter();
  const { brands, setActiveBrandId, currentRole, refreshBrands } = useApp();

  const [step, setStep] = useState<Step>("select-brand");
  const [selectedBrand, setSelectedBrand] = useState<(typeof BRAND_CATALOGUE)[0] | null>(
    BRAND_CATALOGUE[0]
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [eventName, setEventName] = useState("Diwali 2026");
  const [eventDescription, setEventDescription] = useState(
    "Blinkit Diwali 2026 Campaign: Zero crackers, maximum festive warmth, 10-minute sweets, gifts and festive essentials delivery."
  );
  const [loadingPremade, setLoadingPremade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBrand, setCreatedBrand] = useState<BrandProfile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectFileType = (file: File): UploadedFile["type"] => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (ext === "md" || ext === "markdown" || file.type.includes("markdown")) return "markdown";
    return "other";
  };

  const processFiles = useCallback((files: File[]) => {
    const newUploads: UploadedFile[] = files.map((f) => ({
      file: f,
      name: f.name,
      size: formatBytes(f.size),
      type: detectFileType(f),
    }));
    setUploadedFiles((prev) => {
      const existing = new Set(prev.map((u) => u.name));
      return [...prev, ...newUploads.filter((u) => !existing.has(u.name))];
    });
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [processFiles]);

  const loadPremadeFiles = async () => {
    setLoadingPremade(true);
    try {
      const [pdfRes, mdRes] = await Promise.all([
        fetch("/blinkit_guidelines.pdf"),
        fetch("/blinkit_design.md"),
      ]);
      const [pdfBlob, mdBlob] = await Promise.all([pdfRes.blob(), mdRes.blob()]);

      const pdfFile = new File([pdfBlob], "blinkit_guidelines.pdf", {
        type: "application/pdf",
      });
      const mdFile = new File([mdBlob], "blinkit_design.md", {
        type: "text/markdown",
      });

      processFiles([pdfFile, mdFile]);
      setEventName("Diwali 2026");
      setEventDescription(
        "Blinkit Diwali 2026 Campaign: Zero crackers, maximum festive warmth, 10-minute sweets, gifts and festive essentials delivery."
      );
    } catch (err) {
      console.error("Failed to load pre-made guidelines", err);
    } finally {
      setLoadingPremade(false);
    }
  };

  const removeFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((u) => u.name !== name));
  };

  const handleSetupComplete = async () => {
    if (!selectedBrand) return;
    setIsSubmitting(true);
    setError(null);
    setUploadProgress(10);

    try {
      let brand: BrandProfile;

      // Check if brand already exists
      const existingBrand = brands.find(
        (b) => b.name.toLowerCase() === selectedBrand.name.toLowerCase()
      );

      if (existingBrand) {
        brand = existingBrand;
        setUploadProgress(30);
      } else {
        // Create brand profile
        brand = await api.createBrand(
          {
            name: selectedBrand.name,
            industry: selectedBrand.industry,
            tone_persona: selectedBrand.tone,
            approved_hex_palette: selectedBrand.palette,
            banned_terms: selectedBrand.bannedTerms,
            preferred_terminology: {},
            approved_facts: [],
            visual_guidelines_summary: `${selectedBrand.name} brand visual identity guidelines. Use brand colors and approved typography.`,
          },
          { userRole: currentRole }
        );
        setUploadProgress(30);
      }

      setCreatedBrand(brand);
      setActiveBrandId(brand.id);
      setUploadProgress(40);

      // Check if user is using the pre-made Blinkit files
      const hasPremade =
        selectedBrand.id === "blinkit" ||
        uploadedFiles.some((f) => f.name.includes("blinkit_guidelines") || f.name.includes("blinkit_design"));

      if (hasPremade) {
        // Fast-path: backend already has or quickly indexes pre-made guidelines
        try {
          await api.loadPremadeGuidelines(brand.id, { userRole: currentRole });
        } catch (e) {
          console.warn("Premade guidelines sync note:", e);
        }
        setUploadProgress(70);
      }

      // Filter for any custom documents (non-premade)
      const customPdfs = uploadedFiles.filter(
        (u) => u.type === "pdf" && !u.name.includes("blinkit_guidelines")
      );
      const customMds = uploadedFiles.filter(
        (u) => u.type === "markdown" && !u.name.includes("blinkit_design")
      );

      // Upload custom PDFs safely
      for (const pdfUpload of customPdfs) {
        try {
          await api.uploadGuidelinePdf(brand.id, pdfUpload.file, { userRole: currentRole });
        } catch (e) {
          console.warn("Custom PDF upload note:", e);
        }
      }
      setUploadProgress(80);

      // Upload custom markdown files: split into top 5 logical sections, run concurrently
      for (const mdUpload of customMds) {
        try {
          const text = await mdUpload.file.text();
          const sections = text
            .split(/\n##\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 20)
            .slice(0, 6);

          await Promise.allSettled(
            sections.map((sec) => {
              const lines = sec.split("\n");
              const title = lines[0].replace(/#/g, "").trim() || "Design System";
              return api.createGuideline(
                {
                  brand_id: brand.id,
                  content_text: sec.slice(0, 1000),
                  rule_category: "DESIGN",
                  source_document: mdUpload.name,
                  section_reference: title,
                },
                { userRole: currentRole }
              );
            })
          );
        } catch (e) {
          console.warn("Custom markdown upload note:", e);
        }
      }
      setUploadProgress(90);

      // Store event info as a guideline chunk
      if (eventName) {
        try {
          await api.createGuideline(
            {
              brand_id: brand.id,
              content_text: `Upcoming Campaign Event: ${eventName}. ${eventDescription || `This is a key marketing campaign event for ${selectedBrand.name}. All content must be relevant to ${eventName}.`}`,
              rule_category: "EVENT",
              source_document: "Campaign Brief",
              section_reference: "Upcoming Events",
            },
            { userRole: currentRole }
          );
        } catch (e) {
          console.warn("Event guideline chunk note:", e);
        }
      }

      setUploadProgress(100);
      await refreshBrands();
      setStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileTypeIcon = (type: UploadedFile["type"]) => {
    if (type === "pdf") return "📄";
    if (type === "markdown") return "📝";
    return "📎";
  };

  const fileTypeLabel = (type: UploadedFile["type"]) => {
    if (type === "pdf") return "PDF Guidelines";
    if (type === "markdown") return "Design Markdown";
    return "Document";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-yellow-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            I
          </div>
          <span className="font-bold text-slate-900 text-lg">Inkloom AI</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 text-sm">Setup & Onboarding</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
        >
          Skip setup →
        </button>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            {(["select-brand", "upload-docs", "configure", "done"] as Step[]).map((s, i) => {
              const labels = ["Select Brand", "Upload Docs", "Configure", "Done"];
              const isActive = step === s;
              const isDone =
                (["select-brand", "upload-docs", "configure", "done"] as Step[]).indexOf(step) > i;
              return (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-yellow-400 text-slate-900"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        isActive ? "text-slate-800" : isDone ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {labels[i]}
                    </span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-0.5 ${isDone ? "bg-emerald-400" : "bg-slate-100"}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-3xl">

          {/* ── Step 1: Select Brand ─────────────────────────────────────────── */}
          {step === "select-brand" && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Welcome to Inkloom AI 🎉
                </h1>
                <p className="text-slate-500 text-lg">
                  Select a brand to configure your AI content governance platform
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {BRAND_CATALOGUE.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                      selectedBrand?.id === brand.id
                        ? "border-yellow-400 bg-yellow-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border"
                        style={{
                          backgroundColor: brand.primaryColor + "20",
                          borderColor: brand.primaryColor + "40",
                        }}
                      >
                        {brand.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{brand.name}</h3>
                          {brand.isDemo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200">
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{brand.industry}</p>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {brand.description}
                        </p>
                      </div>
                    </div>
                    {brand.palette.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-[11px] text-slate-400">Brand palette:</span>
                        {brand.palette.map((hex) => (
                          <div
                            key={hex}
                            className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
                <strong>💡 Prototype Note:</strong> This is a hackathon demo. Blinkit is pre-configured as a sample client to demonstrate Inkloom AI&apos;s capabilities. The platform is brand-agnostic and works for any company.
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => selectedBrand && setStep("upload-docs")}
                  disabled={!selectedBrand}
                  className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload Documents ─────────────────────────────────────── */}
          {step === "upload-docs" && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">📋</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Upload Brand Documents
                </h1>
                <p className="text-slate-500">
                  Upload your brand guidelines PDF, design system (.md), and specify upcoming events. 
                  These documents train the AI to review content accurately.
                </p>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/30 transition-all mb-6 group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📤</div>
                <h3 className="font-semibold text-slate-700 mb-1">
                  Drop files here or click to upload
                </h3>
                <p className="text-sm text-slate-400">
                  Supports: <strong>.pdf</strong> (guidelines) · <strong>.md</strong> (design system) · <strong>.txt</strong>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.md,.markdown,.txt"
                  className="hidden"
                  onChange={(e) => processFiles(Array.from(e.target.files || []))}
                />
              </div>

              {/* Pre-made options */}
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">🪔</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        Pre-made Prototype Files (Blinkit Diwali 2026)
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">
                          HACKATHON EVALUATION
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-lg">
                        We prepared official prototype brand guidelines (.pdf) and design system (.md) for judges to evaluate Inkloom AI instantly without searching for files.
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <a
                          href="/blinkit_guidelines.pdf"
                          download="blinkit_guidelines.pdf"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1"
                        >
                          📥 Download guidelines.pdf (14 Pages)
                        </a>
                        <span className="text-slate-300">·</span>
                        <a
                          href="/blinkit_design.md"
                          download="blinkit_design.md"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1"
                        >
                          📥 Download design.md
                        </a>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadPremadeFiles}
                    disabled={loadingPremade}
                    className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingPremade ? "Attaching..." : "⚡ Attach Pre-made Files"}
                  </button>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mb-6">
                  <h4 className="text-sm font-semibold text-slate-700">Your uploaded files:</h4>
                  {uploadedFiles.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm"
                    >
                      <span className="text-xl">{fileTypeIcon(f.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                        <p className="text-xs text-slate-400">
                          {fileTypeLabel(f.type)} · {f.size}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(f.name)}
                        className="text-slate-400 hover:text-red-500 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Event Input */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  🗓️ Upcoming Campaign Event
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g. Diwali 2024, Holi, Republic Day"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Event Description (optional)
                    </label>
                    <textarea
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Brief description of the campaign event, target audience, key messages..."
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep("select-brand")}
                  className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep("configure")}
                  className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Configure ────────────────────────────────────────────── */}
          {step === "configure" && selectedBrand && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">⚙️</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Review & Configure
                </h1>
                <p className="text-slate-500">
                  Confirm your setup. These settings will be used to train the AI governance model.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {/* Brand Summary */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{selectedBrand.logo}</span>
                    <div>
                      <h4 className="font-bold text-slate-900">{selectedBrand.name}</h4>
                      <p className="text-xs text-slate-500">{selectedBrand.industry}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block">Tone Persona</span>
                      <p className="text-slate-700 mt-0.5 text-xs leading-relaxed">{selectedBrand.tone}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Color Palette</span>
                      <div className="flex items-center gap-1 mt-1.5">
                        {selectedBrand.palette.map((hex) => (
                          <div key={hex} className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: hex }} title={hex} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="font-semibold text-slate-800 mb-3">📎 Documents to Upload</h4>
                  {uploadedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {uploadedFiles.map((f) => (
                        <div key={f.name} className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{fileTypeIcon(f.type)}</span>
                          <span className="font-medium">{f.name}</span>
                          <span className="text-slate-400">({f.size})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No additional files. Pre-loaded guidelines will be used.</p>
                  )}
                </div>

                {/* Event */}
                {eventName && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                    <h4 className="font-semibold text-amber-800 mb-2">🗓️ Upcoming Campaign Event</h4>
                    <p className="text-sm font-bold text-amber-900">{eventName}</p>
                    {eventDescription && <p className="text-xs text-amber-700 mt-1">{eventDescription}</p>}
                    <p className="text-xs text-amber-600 mt-2">
                      All submitted content will be evaluated for relevance to this campaign event.
                    </p>
                  </div>
                )}

                {/* AI Governance Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                  <h4 className="font-semibold text-blue-800 mb-2">🤖 AI Governance Engine</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>✅ Gemini Vision for image analysis</li>
                    <li>✅ RAG-backed guideline retrieval (pgvector)</li>
                    <li>✅ Deterministic banned-term detection</li>
                    <li>✅ WCAG color contrast checking</li>
                    <li>✅ Campaign event relevance enforcement</li>
                    <li>✅ Superhero / off-brand visual blocking</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {isSubmitting && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Setting up your brand...</span>
                    <span className="text-xs font-mono text-slate-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep("upload-docs")}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-40"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSetupComplete}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeDasharray="32" strokeDashoffset="10" />
                      </svg>
                      Setting up...
                    </>
                  ) : (
                    "🚀 Launch Platform"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ─────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="animate-fade-in text-center">
              <div className="text-6xl mb-6 animate-bounce">🎉</div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                You&apos;re all set!
              </h1>
              <p className="text-slate-500 text-lg mb-2">
                {selectedBrand?.name} is configured and ready for AI content governance.
              </p>
              {createdBrand && (
                <p className="text-sm text-slate-400 mb-8">
                  Brand ID: <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">{createdBrand.id}</code>
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <button
                  onClick={() => router.push("/content")}
                  className="p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-yellow-400 hover:bg-yellow-50/30 transition-all shadow-sm group text-left"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎨</div>
                  <h3 className="font-bold text-slate-800">Creator Studio</h3>
                  <p className="text-xs text-slate-500 mt-1">Submit Instagram posts, posters, videos & audio for AI review</p>
                </button>

                <button
                  onClick={() => router.push("/judge")}
                  className="p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-sm group text-left"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚖️</div>
                  <h3 className="font-bold text-slate-800">Judge Canvas</h3>
                  <p className="text-xs text-slate-500 mt-1">Evaluate content with or without your own guidelines</p>
                </button>

                <button
                  onClick={() => router.push("/dashboard")}
                  className="p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all shadow-sm group text-left"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                  <h3 className="font-bold text-slate-800">Admin Dashboard</h3>
                  <p className="text-xs text-slate-500 mt-1">Approve content, track compliance, manage audit queue</p>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
                Your campaign event <strong className="text-slate-700">&quot;{eventName}&quot;</strong> has been registered. 
                All content submitted under this brand will be checked for event relevance.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
