"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  GuidelineChunk,
  GuidelineSearchResult,
} from "@/lib/types";

function BrandGuidelinesContent() {
  const searchParams = useSearchParams();
  const queryBrandId = searchParams?.get("brand_id");

  const {
    brands,
    activeBrand,
    activeBrandId,
    setActiveBrandId,
    currentRole,
    refreshBrands,
  } = useApp();

  // Tab State
  const [activeTab, setActiveTab] = useState<"CHUNKS" | "TERMINOLOGY" | "BANNED" | "VISUAL">("CHUNKS");

  // Guidelines Chunks State
  const [chunks, setChunks] = useState<GuidelineChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(true);
  const [chunkFilter, setChunkFilter] = useState<string>("ALL");

  // Semantic Search Sandbox State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<GuidelineSearchResult[] | null>(null);

  // PDF Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);

  // Modals
  const [showCreateBrandModal, setShowCreateBrandModal] = useState<boolean>(false);
  const [showEditBrandModal, setShowEditBrandModal] = useState<boolean>(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);

  // Form State: Create Brand
  const [newBrandName, setNewBrandName] = useState<string>("");
  const [newBrandIndustry, setNewBrandIndustry] = useState<string>("");
  const [newBrandTone, setNewBrandTone] = useState<string>("");
  const [newBrandPalette, setNewBrandPalette] = useState<string>("#0F172A, #2563EB, #38BDF8, #F8FAFC");
  const [newBrandBanned, setNewBrandBanned] = useState<string>("guaranteed, unbreakable, cheapest, revolutionary");
  const [newBrandWcag, setNewBrandWcag] = useState<number>(4.5);
  const [isSubmittingBrand, setIsSubmittingBrand] = useState<boolean>(false);

  // Form State: Edit Brand
  const [editTone, setEditTone] = useState<string>("");
  const [editVisualSummary, setEditVisualSummary] = useState<string>("");
  const [editWcag, setEditWcag] = useState<number>(4.5);
  const [editBannedText, setEditBannedText] = useState<string>("");
  const [isSavingBrand, setIsSavingBrand] = useState<boolean>(false);

  // Form State: Add Manual Rule
  const [ruleCategory, setRuleCategory] = useState<string>("TONE");
  const [ruleSourceDoc, setRuleSourceDoc] = useState<string>("Corporate Styleguide 2026.pdf");
  const [rulePage, setRulePage] = useState<number>(1);
  const [ruleSection, setRuleSection] = useState<string>("Core Guidelines");
  const [ruleContent, setRuleContent] = useState<string>("");
  const [isSubmittingRule, setIsSubmittingRule] = useState<boolean>(false);

  // Add Banned Term Quick Input
  const [quickBannedTerm, setQuickBannedTerm] = useState<string>("");
  // Add Terminology Quick Input
  const [quickTermKey, setQuickTermKey] = useState<string>("");
  const [quickTermVal, setQuickTermVal] = useState<string>("");

  // Notification State
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Refresh trigger for chunks
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const reloadGuidelines = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // 1. Synchronize brand_id from query parameter if present
  useEffect(() => {
    if (queryBrandId) {
      const parsed = parseInt(queryBrandId, 10);
      if (!isNaN(parsed) && parsed !== activeBrandId) {
        setActiveBrandId(parsed);
      }
    }
  }, [queryBrandId, activeBrandId, setActiveBrandId]);

  // 2. Fetch Guidelines Chunks for Active Brand
  useEffect(() => {
    let ignore = false;
    async function fetchChunks() {
      if (!activeBrandId) return;
      setIsLoadingChunks(true);
      try {
        const data = await api.listGuidelines(activeBrandId, { userRole: currentRole });
        if (!ignore) {
          setChunks(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setNotification({ type: "error", text: msg || "Failed to load guideline chunks." });
        }
      } finally {
        if (!ignore) {
          setIsLoadingChunks(false);
        }
      }
    }
    fetchChunks();
    return () => {
      ignore = true;
    };
  }, [activeBrandId, currentRole, refreshTrigger]);

  // Open Edit Brand Modal and prefill fields cleanly
  const openEditBrandModal = useCallback(() => {
    if (activeBrand) {
      setEditTone(activeBrand.tone_persona || "");
      setEditVisualSummary(activeBrand.visual_guidelines_summary || "");
      setEditWcag(activeBrand.min_wcag_contrast || 4.5);
      setEditBannedText((activeBrand.banned_terms || []).join(", "));
    }
    setShowEditBrandModal(true);
  }, [activeBrand]);

  // Semantic Vector Search Execution
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !activeBrandId) return;

    setIsSearching(true);
    setNotification(null);
    try {
      const results = await api.searchGuidelines(activeBrandId, searchQuery.trim(), 4, {
        userRole: currentRole,
      });
      setSearchResults(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "Semantic search request failed." });
    } finally {
      setIsSearching(false);
    }
  };

  // PDF Upload Execution
  const handlePdfUpload = async () => {
    if (!uploadFile || !activeBrandId) return;
    if (!uploadFile.name.toLowerCase().endsWith(".pdf")) {
      setNotification({ type: "error", text: "Please select a valid PDF file for ingestion." });
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg("Uploading PDF and extracting multimodal chunks with Gemini Vision...");
    try {
      const extractedChunks = await api.uploadGuidelinePdf(activeBrandId, uploadFile, {
        userRole: currentRole,
      });
      setUploadFile(null);
      setUploadProgressMsg(null);
      reloadGuidelines();
      setNotification({
        type: "success",
        text: `Successfully ingested "${uploadFile.name}". ${extractedChunks.length} semantic chunks indexed in pgvector.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "PDF ingestion failed on backend." });
    } finally {
      setIsUploading(false);
      setUploadProgressMsg(null);
    }
  };

  // Create Manual Rule
  const handleCreateRule = async () => {
    if (!ruleContent.trim() || !activeBrandId) return;
    setIsSubmittingRule(true);
    try {
      await api.createGuideline(
        {
          brand_id: activeBrandId,
          rule_category: ruleCategory,
          source_document: ruleSourceDoc.trim(),
          page_number: rulePage,
          section_reference: ruleSection.trim(),
          content_text: ruleContent.trim(),
        },
        { userRole: currentRole }
      );
      setShowAddRuleModal(false);
      setRuleContent("");
      reloadGuidelines();
      setNotification({
        type: "success",
        text: "New guideline rule committed. 768-dim vector embedding generated successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "Failed to create guideline rule." });
    } finally {
      setIsSubmittingRule(false);
    }
  };

  // Create Brand Profile
  const handleCreateBrand = async () => {
    if (!newBrandName.trim() || !newBrandIndustry.trim()) {
      setNotification({ type: "error", text: "Brand name and industry are required." });
      return;
    }

    setIsSubmittingBrand(true);
    try {
      const palette = newBrandPalette
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const banned = newBrandBanned
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      const created = await api.createBrand(
        {
          name: newBrandName.trim(),
          industry: newBrandIndustry.trim(),
          tone_persona: newBrandTone.trim() || "Authoritative, precise, and transparent.",
          approved_hex_palette: palette,
          banned_terms: banned,
          min_wcag_contrast: newBrandWcag,
          preferred_terminology: {},
        },
        { userRole: currentRole }
      );

      setShowCreateBrandModal(false);
      setNewBrandName("");
      setNewBrandIndustry("");
      setNewBrandTone("");
      await refreshBrands();
      setActiveBrandId(created.id);
      setNotification({
        type: "success",
        text: `Brand profile "${created.name}" created successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "Failed to create brand profile." });
    } finally {
      setIsSubmittingBrand(false);
    }
  };

  // Save Brand Profile Edits
  const handleSaveBrandProfile = async () => {
    if (!activeBrandId) return;
    setIsSavingBrand(true);
    try {
      const banned = editBannedText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await api.updateBrand(
        activeBrandId,
        {
          tone_persona: editTone,
          visual_guidelines_summary: editVisualSummary,
          min_wcag_contrast: editWcag,
          banned_terms: banned,
        },
        { userRole: currentRole }
      );

      setShowEditBrandModal(false);
      await refreshBrands();
      setNotification({
        type: "success",
        text: `Brand profile for "${activeBrand?.name}" updated successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "Failed to update brand profile." });
    } finally {
      setIsSavingBrand(false);
    }
  };

  // Add Banned Term Quick Action
  const handleAddBannedTerm = async () => {
    if (!quickBannedTerm.trim() || !activeBrand) return;
    const term = quickBannedTerm.trim().toLowerCase();
    const existing = activeBrand.banned_terms || [];
    if (existing.includes(term)) {
      setNotification({ type: "error", text: `"${term}" is already in banned terms.` });
      return;
    }

    try {
      const updated = [...existing, term];
      await api.updateBrand(activeBrand.id, { banned_terms: updated }, { userRole: currentRole });
      setQuickBannedTerm("");
      await refreshBrands();
      setNotification({ type: "success", text: `Banned term "${term}" added to active brand rules.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "Failed to add banned term." });
    }
  };

  // Add Preferred Terminology Quick Action
  const handleAddPreferredTerm = async () => {
    if (!quickTermKey.trim() || !quickTermVal.trim() || !activeBrand) return;
    const key = quickTermKey.trim().toLowerCase();
    const val = quickTermVal.trim();

    try {
      const existing = activeBrand.preferred_terminology || {};
      const updated = { ...existing, [key]: val };
      await api.updateBrand(activeBrand.id, { preferred_terminology: updated }, { userRole: currentRole });
      setQuickTermKey("");
      setQuickTermVal("");
      await refreshBrands();
      setNotification({
        type: "success",
        text: `Terminology rule "${key}" ➔ "${val}" committed to brand lexicon.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ type: "error", text: msg || "Failed to add preferred term." });
    }
  };

  // Filtered Chunks
  const filteredChunks = useMemo(() => {
    if (chunkFilter === "ALL") return chunks;
    return chunks.filter((c) => c.rule_category === chunkFilter);
  }, [chunks, chunkFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: chunks.length };
    chunks.forEach((c) => {
      counts[c.rule_category] = (counts[c.rule_category] || 0) + 1;
    });
    return counts;
  }, [chunks]);

  const preferredTermEntries = Object.entries(activeBrand?.preferred_terminology || {});
  const bannedTermsList = activeBrand?.banned_terms || [];
  const paletteList = activeBrand?.approved_hex_palette || [];

  return (
    <div className="relative w-full px-gutter-desktop pb-margin-desktop bg-surface text-on-surface">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-space-md rounded-xl shadow-2xl border flex items-center gap-space-sm max-w-md transition-all ${
            notification.type === "success"
              ? "bg-surface-container-high border-tertiary/40 text-on-surface"
              : "bg-surface-container-high border-error/40 text-on-surface"
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] shrink-0 ${
              notification.type === "success" ? "text-tertiary" : "text-error"
            }`}
          >
            {notification.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="text-[13px] leading-snug flex-1">{notification.text}</p>
          <button
            onClick={() => setNotification(null)}
            className="text-outline hover:text-on-surface text-[16px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Top Command Ribbon & Brand Metadata Context */}
      <section className="flex flex-col gap-space-lg mb-space-xl pt-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-outline font-mono">
                Brand Vector Engine
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="font-code-sm text-[11px] text-tertiary font-mono">
                PostgreSQL pgvector v0.8.7 · Active
              </span>
            </div>

            <div className="flex items-center gap-space-md flex-wrap">
              <h1 className="font-headline-xl text-[28px] sm:text-[32px] text-on-surface font-semibold tracking-tight">
                Brand Guidelines & Rules Engine
              </h1>
              <div className="flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-tertiary-container/30 text-tertiary border border-tertiary/20">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="font-label-sm text-[11px] font-semibold tracking-wide font-mono">
                  {activeBrand ? activeBrand.name : "Blinkit"} (ID #{activeBrandId})
                </span>
              </div>
            </div>
          </div>

          {/* Action Palette */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={openEditBrandModal}
              type="button"
              className="flex items-center gap-space-sm px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-body-sm text-[13px] transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setShowAddRuleModal(true)}
              type="button"
              className="flex items-center gap-space-sm px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-body-sm text-[13px] transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">add_circle</span>
              <span>Add Custom Rule</span>
            </button>

            <button
              onClick={() => setShowCreateBrandModal(true)}
              type="button"
              className="flex items-center gap-space-sm px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-sm text-[13px] font-semibold shadow-[0_0_16px_rgba(124,58,237,0.35)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">domain_add</span>
              <span>New Brand Profile</span>
            </button>
          </div>
        </div>

        {/* Multi-Profile Selector Tabs */}
        <div className="flex items-center justify-between border-b-0 pb-0 gap-space-md flex-wrap">
          <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 overflow-x-auto max-w-full">
            {brands.slice(0, 5).map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrandId(b.id)}
                type="button"
                className={`px-space-md py-1.5 rounded-lg font-body-sm text-[13px] transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  b.id === activeBrandId
                    ? "bg-surface-container-highest text-on-surface font-semibold shadow-sm border border-primary/40 text-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    b.id === activeBrandId ? "text-primary" : "text-outline"
                  }`}
                >
                  domain
                </span>
                <span>{b.name}</span>
                <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container-lowest font-mono text-outline">
                  #{b.id}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-space-md text-on-surface-variant font-code-sm text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span>
                WCAG AA Standard: <strong className="text-on-surface font-medium">{activeBrand?.min_wcag_contrast || 4.5}:1</strong>
              </span>
            </div>
            <span className="text-outline-variant">/</span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-outline">storage</span>
              <span>{chunks.length} Rules in Vector Index</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top Ingestion Hero Banner & Multimodal PDF Upload */}
      <section className="relative rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/30 shadow-xl p-space-lg mb-space-xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
          {/* Ingestion Pipeline Specs */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-[10px] tracking-wider uppercase font-semibold font-mono">
                Multimodal PDF Ingestor
              </span>
              <span className="font-label-sm text-[11px] text-outline font-mono">
                Continuous Document Indexing
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="font-headline-lg text-[20px] sm:text-[24px] text-on-surface font-semibold">
                Sync & Ingest Brand Guides into pgvector
              </h2>
              <p className="font-body-md text-[13px] text-on-surface-variant max-w-2xl leading-relaxed">
                Inkloom extracts hard governance constraints, voice tone vectors, terminology rules, and forbidden phrases
                directly from your PDF source manuals using Gemini 3.5 Flash and indexes 768-dim embeddings.
              </p>
            </div>

            {/* Currently Active Source Document Badge */}
            <div className="p-space-sm rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between gap-space-md shadow-sm">
              <div className="flex items-center gap-space-md min-w-0">
                <div className="w-10 h-10 rounded-lg bg-error-container/40 flex items-center justify-center shrink-0 text-error">
                  <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-code-md text-[13px] text-on-surface font-medium truncate font-mono">
                      {chunks[0]?.source_document || "Blinkit Brand Voice & Tone Guide 2024.pdf"}
                    </span>
                    <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-outline font-mono">
                      {chunks.length} Chunks
                    </span>
                  </div>
                  <span className="font-body-sm text-[11px] text-tertiary flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[15px]">task_alt</span>
                    Parsed via DocumentService · pgvector embeddings active
                  </span>
                </div>
              </div>

              <button
                onClick={reloadGuidelines}
                type="button"
                className="shrink-0 px-space-sm py-1 rounded text-outline hover:text-on-surface transition-colors flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                title="Reload guideline chunks from database"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Refresh</span>
              </button>
            </div>

            {/* Format Chips */}
            <div className="flex items-center gap-2 text-outline font-label-sm text-[11px] font-mono flex-wrap">
              <span>Supported Formats:</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">PDF (Vector+Scan)</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">WCAG 2.1 AA</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">Figma Tokens</span>
            </div>
          </div>

          {/* Dropzone Action Area */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="relative group p-space-lg rounded-xl bg-surface-container/60 border-2 border-dashed border-outline-variant/40 hover:border-primary-container/80 transition-all flex flex-col items-center justify-center text-center">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
              />

              <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center mb-space-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">
                  {isUploading ? "sync" : "upload_file"}
                </span>
              </div>

              <span className="font-headline-sm text-[14px] text-on-surface font-semibold mb-1">
                {uploadFile ? uploadFile.name : "Upload Styleguide PDF Document"}
              </span>
              <p className="font-body-sm text-[12px] text-on-surface-variant mb-space-sm max-w-xs">
                {uploadFile
                  ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Ready for Ingestion`
                  : "Drag and drop brand book PDF or click to browse"}
              </p>

              {uploadFile ? (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePdfUpload();
                  }}
                  className="z-30 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-[12px] font-semibold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isUploading ? "animate-spin" : ""}`}>
                    {isUploading ? "refresh" : "cloud_upload"}
                  </span>
                  <span>{isUploading ? "Ingesting..." : "Execute PDF Ingestion"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-surface-container-highest text-secondary font-label-sm text-[11px] uppercase tracking-wider font-semibold font-mono">
                    Select File
                  </span>
                  <span className="font-code-sm text-[10px] text-outline font-mono">Max 100MB</span>
                </div>
              )}

              {uploadProgressMsg && (
                <span className="mt-2 text-[11px] text-primary font-mono animate-pulse">
                  {uploadProgressMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Semantic Vector Search Sandbox */}
      <section className="mb-space-xl p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">manage_search</span>
            <div>
              <h3 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Semantic Vector RAG Search Sandbox
              </h3>
              <p className="text-[12px] text-on-surface-variant">
                Test real cosine similarity matching against pgvector 768-dim embeddings for {activeBrand?.name}.
              </p>
            </div>
          </div>

          <span className="font-code-sm text-[11px] text-outline font-mono">
            Model: gemini-embedding-2 (768-dim)
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. 'contrast and accessibility rules', 'pricing tiers', or 'security claims'..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container text-on-surface placeholder:text-outline font-body-sm text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-space-lg h-10 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-sm text-[13px] font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSearching ? "animate-spin" : ""}`}>
              {isSearching ? "refresh" : "bolt"}
            </span>
            <span>{isSearching ? "Querying..." : "Semantic Search"}</span>
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults && (
          <div className="flex flex-col gap-space-sm pt-space-xs border-t border-outline-variant/20">
            <div className="flex items-center justify-between text-[11px] font-mono text-outline">
              <span>Found {searchResults.length} relevant guideline matches</span>
              <button
                type="button"
                onClick={() => setSearchResults(null)}
                className="hover:text-on-surface"
              >
                Clear Search
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  className="p-space-md rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-mono text-[10px] font-bold uppercase">
                      {res.chunk.rule_category}
                    </span>
                    <span className="font-mono text-[11px] text-tertiary font-bold">
                      {(res.similarity_score * 100).toFixed(1)}% Similarity
                    </span>
                  </div>

                  <p className="text-[13px] text-on-surface leading-snug font-sans">
                    {res.chunk.content_text}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-outline pt-1 border-t border-outline-variant/20">
                    <span className="truncate max-w-[200px]">Doc: {res.chunk.source_document}</span>
                    <span>
                      Page {res.chunk.page_number ?? "—"} · {res.chunk.section_reference || "General"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Tabbed Rule & Brand Policy Inspector */}
      <section className="flex flex-col gap-space-md">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-space-sm border-b border-outline-variant/20 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("CHUNKS")}
            className={`flex items-center gap-2 px-space-md py-2 rounded-lg font-headline-sm text-[13px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "CHUNKS"
                ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Vector Guideline Chunks</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest">
              {chunks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TERMINOLOGY")}
            className={`flex items-center gap-2 px-space-md py-2 rounded-lg font-headline-sm text-[13px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "TERMINOLOGY"
                ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">translate</span>
            <span>Approved Terminology</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest">
              {preferredTermEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANNED")}
            className={`flex items-center gap-2 px-space-md py-2 rounded-lg font-headline-sm text-[13px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "BANNED"
                ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">block</span>
            <span>Prohibited Lexicon</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest">
              {bannedTermsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VISUAL")}
            className={`flex items-center gap-2 px-space-md py-2 rounded-lg font-headline-sm text-[13px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "VISUAL"
                ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">palette</span>
            <span>Visual & Accessibility</span>
          </button>
        </div>

        {/* TAB 1: VECTOR GUIDELINE CHUNKS */}
        {activeTab === "CHUNKS" && (
          <div className="flex flex-col gap-space-md">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              {Object.keys(categoryCounts).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setChunkFilter(cat)}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                    chunkFilter === cat
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {cat} ({categoryCounts[cat]})
                </button>
              ))}
            </div>

            {/* Chunks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {isLoadingChunks ? (
                <div className="col-span-2 py-12 text-center text-outline font-mono">
                  Loading indexed guideline chunks...
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-outline">
                  No guideline chunks found for this category.
                </div>
              ) : (
                filteredChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-space-sm hover:bg-surface-container/50 transition-colors"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                            chunk.rule_category === "TONE"
                              ? "bg-secondary-container text-on-secondary-container"
                              : chunk.rule_category === "TERMINOLOGY"
                              ? "bg-primary-container text-on-primary-container"
                              : chunk.rule_category === "ACCESSIBILITY"
                              ? "bg-tertiary-container text-on-tertiary-container"
                              : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {chunk.rule_category}
                        </span>
                        <span className="font-code-sm text-[10px] text-outline font-mono">
                          CHUNK-#{chunk.id} · Triggered: {chunk.times_triggered}x
                        </span>
                      </div>

                      <p className="font-body-sm text-[13px] text-on-surface leading-relaxed">
                        {chunk.content_text}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-outline pt-2 border-t border-outline-variant/20">
                      <span className="truncate max-w-[200px]" title={chunk.source_document}>
                        {chunk.source_document}
                      </span>
                      <span>
                        Page {chunk.page_number ?? "—"} · {chunk.section_reference || "Rule"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: APPROVED TERMINOLOGY */}
        {activeTab === "TERMINOLOGY" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-desktop items-start">
            {/* Left 8 cols: Terminology Table */}
            <div className="xl:col-span-8 flex flex-col gap-space-md">
              <div className="rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/30 shadow-sm">
                <div className="grid grid-cols-12 gap-2 px-space-md py-space-sm bg-surface-container font-mono text-[11px] uppercase tracking-wider text-outline select-none">
                  <div className="col-span-5">Canonical Preferred Term</div>
                  <div className="col-span-5">Supersedes / Deprecates</div>
                  <div className="col-span-2 text-right">Standard</div>
                </div>

                <div className="divide-y divide-outline-variant/10 font-body-sm text-[13px]">
                  {preferredTermEntries.length === 0 ? (
                    <div className="p-8 text-center text-outline">
                      No preferred terminology dictionary defined for this brand.
                    </div>
                  ) : (
                    preferredTermEntries.map(([deprecated, canonical]) => (
                      <div
                        key={deprecated}
                        className="grid grid-cols-12 gap-2 p-space-md hover:bg-surface-container/40 transition-colors items-center"
                      >
                        <div className="col-span-5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
                          <span className="font-semibold text-on-surface font-sans">{canonical}</span>
                        </div>
                        <div className="col-span-5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-error text-[16px]">cancel</span>
                          <span className="line-through text-outline font-mono text-[12px]">{deprecated}</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-mono text-[10px] font-semibold">
                            ACTIVE
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right 4 cols: Quick Add Terminology */}
            <div className="xl:col-span-4 p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-space-sm">
              <span className="font-headline-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">add_link</span>
                Add Preferred Terminology
              </span>
              <p className="text-[12px] text-on-surface-variant">
                Map colloquial or deprecated terminology to approved canonical terms.
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <div>
                  <label className="text-[11px] text-outline font-mono uppercase">Deprecated Phrasing:</label>
                  <input
                    type="text"
                    value={quickTermKey}
                    onChange={(e) => setQuickTermKey(e.target.value)}
                    placeholder="e.g. client-side"
                    className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-outline font-mono uppercase">Canonical Preferred Term:</label>
                  <input
                    type="text"
                    value={quickTermVal}
                    onChange={(e) => setQuickTermVal(e.target.value)}
                    placeholder="e.g. on-device"
                    className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPreferredTerm}
                  disabled={!quickTermKey.trim() || !quickTermVal.trim()}
                  className="mt-2 w-full py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold text-[12px] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Save Terminology Mapping
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROHIBITED LEXICON */}
        {activeTab === "BANNED" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-desktop items-start">
            {/* Left 8 cols: Banned Terms List */}
            <div className="xl:col-span-8 flex flex-col gap-space-md">
              <div className="p-space-md rounded-xl bg-error-container/20 border border-error/30 flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">policy</span>
                <div className="flex flex-col gap-1">
                  <span className="font-body-sm text-[13px] font-semibold text-error">
                    Strict Prohibited Lexicon Enforcement
                  </span>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">
                    Phrases in this list are strictly evaluated during Content Audit. Banned terms trigger
                    automatic <code className="text-error font-mono text-[11px]">CRITICAL</code> severity flags.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {bannedTermsList.map((term) => (
                  <div
                    key={term}
                    className="p-3 rounded-xl bg-surface-container-low border border-error/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-error" />
                      <span className="font-mono text-[13px] text-on-surface font-semibold">“{term}”</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-error-container/40 text-error font-mono text-[10px] font-bold uppercase">
                      BANNED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 4 cols: Quick Add Banned Term */}
            <div className="xl:col-span-4 p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-space-sm">
              <span className="font-headline-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[18px]">add_moderator</span>
                Add Prohibited Term
              </span>
              <p className="text-[12px] text-on-surface-variant">
                Append a banned word or phrase to block across all collateral.
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <input
                  type="text"
                  value={quickBannedTerm}
                  onChange={(e) => setQuickBannedTerm(e.target.value)}
                  placeholder="e.g. unhackable, bulletproof, guaranteed"
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddBannedTerm}
                  disabled={!quickBannedTerm.trim()}
                  className="w-full py-2 rounded-lg bg-error-container text-on-error-container font-semibold text-[12px] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Commit Banned Term
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VISUAL & ACCESSIBILITY */}
        {activeTab === "VISUAL" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-desktop items-start">
            {/* Swatches Card */}
            <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-space-md shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                  Approved Color Palette
                </span>
                <span className="font-mono text-[11px] text-tertiary">
                  WCAG AA Contrast: {activeBrand?.min_wcag_contrast || 4.5}:1
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
                {paletteList.map((hex) => (
                  <div key={hex} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                    <div
                      className="w-16 h-16 rounded-xl shadow-inner border border-white/10"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-[12px] text-on-surface font-bold uppercase">{hex}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-surface-container text-[12px] text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface block mb-1">Visual Guidelines Summary:</strong>
                {activeBrand?.visual_guidelines_summary ||
                  "Ensure all interactive UI elements meet minimum 4.5:1 contrast against dark background."}
              </div>
            </div>

            {/* Tone Persona Card */}
            <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-space-md shadow-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Brand Tone & Editorial Persona
              </span>

              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 text-[13px] text-on-surface leading-relaxed">
                {activeBrand?.tone_persona || "Clear, authoritative, empathetic, and evidence-backed."}
              </div>

              <div className="flex flex-col gap-2 font-mono text-[11px] text-outline">
                <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                  <span>Industry Sector:</span>
                  <span className="text-on-surface font-semibold">{activeBrand?.industry}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                  <span>Registered Timestamp:</span>
                  <span className="text-on-surface">{activeBrand ? new Date(activeBrand.created_at).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CREATE BRAND MODAL */}
      {showCreateBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Create Brand Governance Profile
              </span>
              <button onClick={() => setShowCreateBrandModal(false)} className="text-outline hover:text-on-surface text-[18px]">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Brand Name:</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. CyberDefense Global"
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Industry:</label>
                <input
                  type="text"
                  value={newBrandIndustry}
                  onChange={(e) => setNewBrandIndustry(e.target.value)}
                  placeholder="e.g. Enterprise Security"
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Tone Persona:</label>
                <textarea
                  value={newBrandTone}
                  onChange={(e) => setNewBrandTone(e.target.value)}
                  placeholder="e.g. Authoritative, direct, research-backed."
                  className="w-full h-20 p-2.5 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Approved Palette (Hex comma-separated):</label>
                <input
                  type="text"
                  value={newBrandPalette}
                  onChange={(e) => setNewBrandPalette(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] font-mono border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Banned Terms (Comma-separated):</label>
                <input
                  type="text"
                  value={newBrandBanned}
                  onChange={(e) => setNewBrandBanned(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] font-mono border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Minimum WCAG Contrast Ratio:</label>
                <input
                  type="number"
                  step="0.1"
                  value={newBrandWcag}
                  onChange={(e) => setNewBrandWcag(parseFloat(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] font-mono border border-outline-variant/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowCreateBrandModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBrand || !newBrandName.trim()}
                onClick={handleCreateBrand}
                className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-[12px] disabled:opacity-50"
              >
                {isSubmittingBrand ? "Creating..." : "Save Brand Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {showEditBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Edit {activeBrand?.name} Profile
              </span>
              <button onClick={() => setShowEditBrandModal(false)} className="text-outline hover:text-on-surface text-[18px]">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Tone Persona:</label>
                <textarea
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value)}
                  className="w-full h-24 p-2.5 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Visual Guidelines Summary:</label>
                <textarea
                  value={editVisualSummary}
                  onChange={(e) => setEditVisualSummary(e.target.value)}
                  className="w-full h-20 p-2.5 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Banned Terms (Comma-separated):</label>
                <input
                  type="text"
                  value={editBannedText}
                  onChange={(e) => setEditBannedText(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] font-mono border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Minimum WCAG Contrast:</label>
                <input
                  type="number"
                  step="0.1"
                  value={editWcag}
                  onChange={(e) => setEditWcag(parseFloat(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] font-mono border border-outline-variant/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowEditBrandModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingBrand}
                onClick={handleSaveBrandProfile}
                className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-[12px] disabled:opacity-50"
              >
                {isSavingBrand ? "Saving..." : "Commit Updates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUAL RULE MODAL */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">add_circle</span>
                <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                  Add Guideline Rule (pgvector Chunk)
                </span>
              </div>
              <button onClick={() => setShowAddRuleModal(false)} className="text-outline hover:text-on-surface text-[18px]">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-on-surface-variant font-medium">Category:</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                  >
                    <option value="TONE">TONE</option>
                    <option value="TERMINOLOGY">TERMINOLOGY</option>
                    <option value="ACCESSIBILITY">ACCESSIBILITY</option>
                    <option value="FACTUAL_CLAIM">FACTUAL_CLAIM</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-on-surface-variant font-medium">Page Number:</label>
                  <input
                    type="number"
                    value={rulePage}
                    onChange={(e) => setRulePage(parseInt(e.target.value, 10))}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] font-mono border border-outline-variant/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Source Document:</label>
                <input
                  type="text"
                  value={ruleSourceDoc}
                  onChange={(e) => setRuleSourceDoc(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Section Reference:</label>
                <input
                  type="text"
                  value={ruleSection}
                  onChange={(e) => setRuleSection(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Guideline Content Text:</label>
                <textarea
                  value={ruleContent}
                  onChange={(e) => setRuleContent(e.target.value)}
                  placeholder="e.g. Do not use absolute superlatives. Always back resilience claims with empirical SLA metrics."
                  className="w-full h-24 p-2.5 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowAddRuleModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRule || !ruleContent.trim()}
                onClick={handleCreateRule}
                className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-[12px] disabled:opacity-50"
              >
                {isSubmittingRule ? "Generating Vector..." : "Commit Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandGuidelinesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
              refresh
            </span>
            <span className="text-[14px] text-outline font-mono">Loading Brand Guidelines...</span>
          </div>
        </div>
      }
    >
      <BrandGuidelinesContent />
    </Suspense>
  );
}
