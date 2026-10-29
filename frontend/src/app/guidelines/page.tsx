"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  GuidelineChunk,
  GuidelineSearchResult,
} from "@/lib/types";
import {
  PlusCircle,
  Pencil,
  Building2,
  UploadCloud,
  Search,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  BookOpen,
  Languages,
  Ban,
  Palette,
  ArrowUpCircle,
  Loader2,
  Sliders,
  MessageSquare,
} from "@/components/ui/icons";

function BrandGuidelinesContent() {
  const searchParams = useSearchParams();
  const queryBrandId = searchParams?.get("brand_id");

  const {
    activeBrand,
    activeBrandId,
    setActiveBrandId,
    currentRole,
    refreshBrands,
    theme,
  } = useApp();

  const isDark = theme === "dark";

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
  const [newBrandPalette, setNewBrandPalette] = useState<string>("#F8C200, #1C1C1E, #FFFFFF, #00A36C, #FF6B35");
  const [newBrandBanned, setNewBrandBanned] = useState<string>("instant, guaranteed, free forever, revolutionary");
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
  const [ruleSourceDoc, setRuleSourceDoc] = useState<string>("Brand Guidelines Manual 2026.pdf");
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
          setNotification({ type: "error", text: msg || "Failed to load guideline rules." });
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
    setUploadProgressMsg("Extracting brand guidelines and indexing vector embeddings...");
    try {
      const extractedChunks = await api.uploadGuidelinePdf(activeBrandId, uploadFile, {
        userRole: currentRole,
      });
      setUploadFile(null);
      setUploadProgressMsg(null);
      reloadGuidelines();
      setNotification({
        type: "success",
        text: `Successfully ingested "${uploadFile.name}". ${extractedChunks.length} policy rules indexed.`,
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
        text: "New guideline rule saved and indexed successfully.",
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
      setNotification({ type: "success", text: `Banned term "${term}" added successfully.` });
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
        text: `Terminology rule "${key}" ➔ "${val}" committed successfully.`,
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
    <div
      className={`min-h-screen px-4 sm:px-6 lg:px-8 py-6 font-mono transition-colors ${
        isDark ? "bg-[#101010] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 border-3 border-black shadow-[6px_6px_0px_#000000] flex items-center gap-3 max-w-md transition-all ${
            notification.type === "success"
              ? "bg-[var(--green)] text-black"
              : "bg-[var(--red)] text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={20} className="text-black shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-white shrink-0" />
          )}
          <p className="text-xs font-mono font-bold leading-snug flex-1">{notification.text}</p>
          <button
            onClick={() => setNotification(null)}
            className="w-6 h-6 border-2 border-black bg-white text-black font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header
        className={`p-5 sm:p-6 border-4 ${
          isDark
            ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
            : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
        } flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6`}
      >
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 border-2 border-black bg-[var(--yellow)] text-black text-[10px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
              POLICY REPOSITORY
            </span>
            <span className="text-xs font-mono font-black text-[#555] dark:text-[#a0a5b5]">
              GOVERNING BRAND:{" "}
              <strong className="text-[var(--ink)] dark:text-white uppercase">
                {activeBrand?.name || "Blinkit"}
              </strong>{" "}
              · SECTOR:{" "}
              <strong className="text-[var(--ink)] dark:text-white uppercase">
                {activeBrand?.industry || "Retail & E-Commerce"}
              </strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-archivo font-black uppercase tracking-tight text-[var(--ink)] dark:text-white">
            Brand Guidelines &amp; Policy Studio
          </h1>
          <p className="mt-1 text-xs font-mono text-[#555] dark:text-[#a0a5b5] max-w-2xl leading-relaxed">
            Manage deterministic compliance rules, RAG vector embeddings, approved palettes, and terminology standards for autonomous brand governance.
          </p>
        </div>

        {/* Action Button Palette */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowAddRuleModal(true)}
            type="button"
            className="h-10 px-3.5 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Add Rule</span>
          </button>

          <button
            onClick={openEditBrandModal}
            type="button"
            className="h-10 px-3.5 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Pencil size={15} />
            <span>Edit Brand</span>
          </button>

          <button
            onClick={() => setShowCreateBrandModal(true)}
            type="button"
            className="h-10 px-3.5 border-2 border-black bg-[var(--pink)] hover:opacity-95 text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 size={15} />
            <span>New Brand</span>
          </button>
        </div>
      </header>

      {/* 1. Ingestion & Semantic Search Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: PDF Styleguide Ingestion Box (6 cols) */}
        <div
          className={`lg:col-span-6 p-5 sm:p-6 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
          } flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-black dark:text-white">
                  upload_file
                </span>
                <h2 className="font-archivo font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                  Ingest Brand Guide (PDF)
                </h2>
              </div>
              <span className="text-[10px] font-mono font-black uppercase text-[#666] dark:text-[#888]">
                VECTOR RAG PIPELINE
              </span>
            </div>

            {/* Dropzone Container */}
            <div
              className={`relative p-6 border-3 border-dashed border-black transition-all flex flex-col items-center justify-center text-center shadow-[3px_3px_0px_#000] ${
                isDark
                  ? "bg-[#141518] hover:bg-[#1c1d22]"
                  : "bg-[var(--paper)] hover:bg-white"
              }`}
            >
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

              <div className="w-12 h-12 border-2 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-2 shadow-[2px_2px_0px_#000]">
                <UploadCloud size={24} />
              </div>

              <span className="text-xs font-mono font-black uppercase mb-0.5 text-[var(--ink)] dark:text-white">
                {uploadFile ? uploadFile.name : "Drag & drop brand PDF or click to browse"}
              </span>
              <p className="text-[10px] font-mono text-[#666] dark:text-[#888]">
                {uploadFile
                  ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Ready for pgvector indexing`
                  : "PDF design systems, brand manuals, and campaign briefs"}
              </p>

              {uploadFile && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePdfUpload();
                  }}
                  className="mt-3.5 z-30 px-4 py-2 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowUpCircle size={14} />
                  )}
                  <span>{isUploading ? "Extracting..." : "Ingest PDF to Vector DB"}</span>
                </button>
              )}

              {uploadProgressMsg && (
                <span className="mt-2 text-[10px] font-mono font-bold text-[var(--yellow)] dark:text-[#ffdb1f] animate-pulse">
                  {uploadProgressMsg}
                </span>
              )}
            </div>
          </div>

          {/* Active Source File Footer */}
          <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-[10px] font-mono">
            <span className="truncate max-w-[280px] text-[#555] dark:text-[#a0a5b5]">
              Active: <strong className="text-[var(--ink)] dark:text-white">{chunks[0]?.source_document || "Blinkit Brand Voice & Tone Guide 2024.pdf"}</strong>
            </span>
            <button
              onClick={reloadGuidelines}
              type="button"
              className="px-2.5 py-1 border border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black uppercase shadow-[1px_1px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 flex items-center gap-1 cursor-pointer transition-all"
            >
              <RefreshCw size={11} />
              <span>Sync Rules</span>
            </button>
          </div>
        </div>

        {/* Right: Policy Semantic Search (6 cols) */}
        <div
          className={`lg:col-span-6 p-5 sm:p-6 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
          } flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-black dark:text-white">
                  troubleshoot
                </span>
                <h2 className="font-archivo font-black text-sm uppercase text-[var(--ink)] dark:text-white">
                  Semantic Policy Search
                </h2>
              </div>
              <span className="text-[10px] font-mono font-black uppercase text-[#666] dark:text-[#888]">
                COSINE SIMILARITY TEST
              </span>
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-2.5 pointer-events-none text-[#666] dark:text-[#888]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query brand rules, tone, claims, or accessibility..."
                  className={`w-full h-10 pl-9 pr-3 border-2 border-black font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none ${
                    isDark ? "bg-[#141518] text-white" : "bg-white text-[var(--ink)]"
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="h-10 px-4 border-2 border-black bg-[var(--blue)] hover:bg-[#8cc7ff] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all shrink-0"
              >
                {isSearching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>{isSearching ? "Searching..." : "Search"}</span>
              </button>
            </form>

            {/* Results container */}
            {searchResults ? (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase font-black pb-1 border-b-2 border-black text-[#555] dark:text-[#a0a5b5]">
                  <span>{searchResults.length} Semantic Matches Found</span>
                  <button
                    type="button"
                    onClick={() => setSearchResults(null)}
                    className="hover:underline cursor-pointer text-[var(--red)]"
                  >
                    Clear Search
                  </button>
                </div>

                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-3 border-2 border-black bg-white dark:bg-[#141518] text-xs font-mono shadow-[2px_2px_0px_#000] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 border border-black text-[9px] font-black uppercase bg-[var(--yellow)] text-black">
                        {res.chunk.rule_category}
                      </span>
                      <span className="font-mono text-[10px] font-black text-[var(--green)] dark:text-[#b9f4a8]">
                        {(res.similarity_score * 100).toFixed(1)}% Match
                      </span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed text-[var(--ink)] dark:text-[#c9d1d9] mt-0.5">
                      {res.chunk.content_text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-black bg-[var(--paper)]/50 dark:bg-[#141518] text-center text-xs font-mono text-[#555] dark:text-[#888]">
                Type a query above to test live semantic vector retrieval against the knowledge base.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t-2 border-black text-[10px] font-mono text-[#555] dark:text-[#a0a5b5]">
            Target Workspace: <strong className="text-[var(--ink)] dark:text-white uppercase">{activeBrand?.name}</strong>
          </div>
        </div>
      </div>

      {/* 2. High-Contrast Tabbed Policy Inspector */}
      <div className="flex flex-col gap-5">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 p-1.5 border-3 border-black bg-white dark:bg-[#18191f] shadow-[4px_4px_0px_#000] max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("CHUNKS")}
            className={`flex items-center gap-2 px-4 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "CHUNKS"
                ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                : "bg-white dark:bg-[#141518] text-black dark:text-white hover:bg-black/5"
            }`}
          >
            <BookOpen size={14} />
            <span>Brand Rules</span>
            <span className="px-1.5 py-0.2 border border-black bg-black text-white text-[9px]">
              {chunks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TERMINOLOGY")}
            className={`flex items-center gap-2 px-4 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "TERMINOLOGY"
                ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                : "bg-white dark:bg-[#141518] text-black dark:text-white hover:bg-black/5"
            }`}
          >
            <Languages size={14} />
            <span>Terminology</span>
            <span className="px-1.5 py-0.2 border border-black bg-black text-white text-[9px]">
              {preferredTermEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANNED")}
            className={`flex items-center gap-2 px-4 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "BANNED"
                ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                : "bg-white dark:bg-[#141518] text-black dark:text-white hover:bg-black/5"
            }`}
          >
            <Ban size={14} />
            <span>Banned Terms</span>
            <span className="px-1.5 py-0.2 border border-black bg-black text-white text-[9px]">
              {bannedTermsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VISUAL")}
            className={`flex items-center gap-2 px-4 py-2 border-2 border-black text-xs font-mono font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "VISUAL"
                ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                : "bg-white dark:bg-[#141518] text-black dark:text-white hover:bg-black/5"
            }`}
          >
            <Palette size={14} />
            <span>Visual Identity</span>
          </button>
        </div>

        {/* TAB 1: BRAND RULES */}
        {activeTab === "CHUNKS" && (
          <div className="flex flex-col gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {Object.keys(categoryCounts).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setChunkFilter(cat)}
                  className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                    chunkFilter === cat
                      ? "bg-[var(--yellow)] text-black shadow-[3px_3px_0px_#000] translate-x-0.5 translate-y-0.5"
                      : "bg-white dark:bg-[#18191f] text-black dark:text-white shadow-[2px_2px_0px_#000]"
                  }`}
                >
                  {cat} ({categoryCounts[cat]})
                </button>
              ))}
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingChunks ? (
                <div className="col-span-2 py-12 text-center text-xs font-mono border-3 border-dashed border-black bg-white dark:bg-[#18191f]">
                  Loading guideline rules from knowledge base...
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-xs font-mono border-3 border-dashed border-black bg-white dark:bg-[#18191f]">
                  No rules found for this category.
                </div>
              ) : (
                filteredChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className={`p-5 border-3 border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-3 ${
                      isDark ? "bg-[#18191f]" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 border border-black font-mono text-[9px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#000] ${
                            chunk.rule_category === "TONE"
                              ? "bg-[var(--pink)] text-black"
                              : chunk.rule_category === "TERMINOLOGY"
                              ? "bg-[var(--blue)] text-black"
                              : chunk.rule_category === "ACCESSIBILITY"
                              ? "bg-[var(--green)] text-black"
                              : "bg-[var(--yellow)] text-black"
                          }`}
                        >
                          {chunk.rule_category}
                        </span>
                        <span className="text-[10px] font-mono text-[#666] dark:text-[#888] font-bold">
                          Triggered: {chunk.times_triggered}x
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed font-mono text-[var(--ink)] dark:text-[#c9d1d9]">
                        {chunk.content_text}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-2.5 border-t-2 border-black text-[#555] dark:text-[#888]">
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

        {/* TAB 2: TERMINOLOGY */}
        {activeTab === "TERMINOLOGY" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 8 cols: Terminology Table */}
            <div
              className={`xl:col-span-8 border-4 border-black shadow-[6px_6px_0px_#000] overflow-hidden ${
                isDark ? "bg-[#18191f]" : "bg-white"
              }`}
            >
              <div className="grid grid-cols-12 gap-2 px-4 py-3 font-mono text-[10px] uppercase font-black border-b-3 border-black bg-[var(--yellow)] text-black">
                <div className="col-span-5">Canonical Preferred Term</div>
                <div className="col-span-5">Avoid / Deprecated Phrase</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              <div className="divide-y-2 divide-black text-xs font-mono">
                {preferredTermEntries.length === 0 ? (
                  <div className="p-8 text-center text-[#555] dark:text-[#888]">
                    No preferred terminology defined for this brand.
                  </div>
                ) : (
                  preferredTermEntries.map(([deprecated, canonical]) => (
                    <div
                      key={deprecated}
                      className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="col-span-5 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[var(--ink)] dark:text-[#b9f4a8] shrink-0" />
                        <span className="font-bold text-[var(--ink)] dark:text-white">{canonical}</span>
                      </div>
                      <div className="col-span-5 flex items-center gap-2">
                        <XCircle size={15} className="text-[var(--red)] shrink-0" />
                        <span className="line-through text-[#666] dark:text-[#888]">
                          {deprecated}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="px-2 py-0.5 border border-black font-mono text-[9px] font-black uppercase bg-[var(--green)] text-black">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right 4 cols: Quick Add Terminology */}
            <div
              className={`xl:col-span-4 p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col gap-4 ${
                isDark ? "bg-[#18191f]" : "bg-[var(--white)]"
              }`}
            >
              <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                <span className="material-symbols-outlined text-[20px] text-black dark:text-white">
                  spellcheck
                </span>
                <h3 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                  Add Terminology Rule
                </h3>
              </div>

              <div className="flex flex-col gap-3 font-mono">
                <div>
                  <label className="text-[10px] uppercase font-black block mb-1 text-[var(--ink)] dark:text-white">
                    Avoid Phrase:
                  </label>
                  <input
                    type="text"
                    value={quickTermKey}
                    onChange={(e) => setQuickTermKey(e.target.value)}
                    placeholder="e.g. delivery boy"
                    className="w-full h-9 px-3 border-2 border-black font-mono text-xs font-bold text-black dark:text-white bg-white dark:bg-[#141518] shadow-[2px_2px_0px_#000] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black block mb-1 text-[var(--ink)] dark:text-white">
                    Preferred Replacement:
                  </label>
                  <input
                    type="text"
                    value={quickTermVal}
                    onChange={(e) => setQuickTermVal(e.target.value)}
                    placeholder="e.g. delivery partner"
                    className="w-full h-9 px-3 border-2 border-black font-mono text-xs font-bold text-black dark:text-white bg-white dark:bg-[#141518] shadow-[2px_2px_0px_#000] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPreferredTerm}
                  disabled={!quickTermKey.trim() || !quickTermVal.trim()}
                  className="mt-1 w-full py-2.5 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Save Terminology
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BANNED TERMS */}
        {activeTab === "BANNED" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 8 cols: Banned Terms List */}
            <div className="xl:col-span-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {bannedTermsList.map((term) => (
                  <div
                    key={term}
                    className="p-4 border-3 border-black bg-[var(--red)]/10 dark:bg-[var(--red)]/15 shadow-[3px_3px_0px_#000] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 border border-black bg-[var(--red)]" />
                      <span className="font-mono text-xs font-bold text-[var(--ink)] dark:text-white">
                        “{term}”
                      </span>
                    </div>
                    <span className="px-2 py-0.5 border border-black font-mono text-[9px] font-black uppercase bg-[var(--red)] text-white shadow-[1px_1px_0px_#000]">
                      BANNED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 4 cols: Quick Add Banned Term */}
            <div
              className={`xl:col-span-4 p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col gap-4 ${
                isDark ? "bg-[#18191f]" : "bg-[var(--white)]"
              }`}
            >
              <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                <span className="material-symbols-outlined text-[20px] text-black dark:text-white">
                  block
                </span>
                <h3 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                  Add Banned Term
                </h3>
              </div>

              <div className="flex flex-col gap-3 font-mono">
                <input
                  type="text"
                  value={quickBannedTerm}
                  onChange={(e) => setQuickBannedTerm(e.target.value)}
                  placeholder="e.g. instant delivery, 100% free"
                  className="w-full h-9 px-3 border-2 border-black font-mono text-xs font-bold text-black dark:text-white bg-white dark:bg-[#141518] shadow-[2px_2px_0px_#000] focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddBannedTerm}
                  disabled={!quickBannedTerm.trim()}
                  className="w-full py-2.5 border-2 border-black bg-[var(--red)] hover:opacity-95 text-white text-xs font-mono font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Save Banned Term
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VISUAL IDENTITY */}
        {activeTab === "VISUAL" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-mono">
            {/* Swatches Card */}
            <div
              className={`p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col gap-4 ${
                isDark ? "bg-[#18191f]" : "bg-[var(--white)]"
              }`}
            >
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  <h3 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                    Approved Brand Palette
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-black uppercase text-[var(--green)] dark:text-[#b9f4a8]">
                  WCAG Contrast: {activeBrand?.min_wcag_contrast || 4.5}:1
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {paletteList.map((hex) => (
                  <div
                    key={hex}
                    className="flex flex-col items-center gap-1.5 p-2.5 border-2 border-black bg-white dark:bg-[#141518] shadow-[2px_2px_0px_#000]"
                  >
                    <div
                      className="w-12 h-12 border-2 border-black shadow-[2px_2px_0px_#000]"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-[10px] font-black uppercase text-[var(--ink)] dark:text-white">
                      {hex}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 border-2 border-black bg-[var(--paper)] dark:bg-[#141518] text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                  <Sliders size={13} />
                  <span>Visual Guidelines Summary</span>
                </div>
                <p className="text-[11px] text-[#555] dark:text-[#a0a5b5]">
                  {activeBrand?.visual_guidelines_summary ||
                    "Ensure all interactive UI elements meet minimum 4.5:1 contrast against dark background."}
                </p>
              </div>
            </div>

            {/* Tone Persona Card */}
            <div
              className={`p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col gap-4 ${
                isDark ? "bg-[#18191f]" : "bg-[var(--white)]"
              }`}
            >
              <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                <MessageSquare size={16} />
                <h3 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                  Tone &amp; Editorial Voice
                </h3>
              </div>

              <div className="p-3.5 border-2 border-black bg-[var(--paper)] dark:bg-[#141518] text-xs leading-relaxed text-[var(--ink)] dark:text-[#c9d1d9]">
                {activeBrand?.tone_persona || "Clear, authoritative, empathetic, and evidence-backed."}
              </div>

              <div className="flex flex-col gap-2 font-mono text-[11px] pt-3 border-t-2 border-black text-[#555] dark:text-[#a0a5b5]">
                <div className="flex items-center justify-between">
                  <span>Industry Sector:</span>
                  <strong className="text-[var(--ink)] dark:text-white uppercase font-black">
                    {activeBrand?.industry}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Registered:</span>
                  <span className="text-[var(--ink)] dark:text-white font-bold">
                    {activeBrand ? new Date(activeBrand.created_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE BRAND MODAL */}
      {showCreateBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg border-4 border-black p-6 shadow-[8px_8px_0px_#000] flex flex-col gap-4 font-mono ${
              isDark ? "bg-[#18191f] text-white" : "bg-[var(--white)] text-[var(--ink)]"
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} />
                <h3 className="font-archivo font-black text-sm uppercase">Create Brand Workspace</h3>
              </div>
              <button
                onClick={() => setShowCreateBrandModal(false)}
                className="w-6 h-6 border-2 border-black bg-white text-black font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Brand Name *</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. CyberDefense Global"
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Industry Sector *</label>
                <input
                  type="text"
                  value={newBrandIndustry}
                  onChange={(e) => setNewBrandIndustry(e.target.value)}
                  placeholder="e.g. Enterprise Security"
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Tone &amp; Persona</label>
                <textarea
                  rows={2}
                  value={newBrandTone}
                  onChange={(e) => setNewBrandTone(e.target.value)}
                  placeholder="e.g. Authoritative, direct, research-backed."
                  className="w-full p-2.5 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Approved Palette (Hex comma-separated)</label>
                <input
                  type="text"
                  value={newBrandPalette}
                  onChange={(e) => setNewBrandPalette(e.target.value)}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Banned Terms (Comma-separated)</label>
                <input
                  type="text"
                  value={newBrandBanned}
                  onChange={(e) => setNewBrandBanned(e.target.value)}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Minimum WCAG Contrast</label>
                <input
                  type="number"
                  step="0.1"
                  value={newBrandWcag}
                  onChange={(e) => setNewBrandWcag(parseFloat(e.target.value))}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setShowCreateBrandModal(false)}
                className="px-4 py-2 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBrand || !newBrandName.trim()}
                onClick={handleCreateBrand}
                className="px-5 py-2 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black text-xs font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingBrand ? "Creating..." : "Save Brand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {showEditBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg border-4 border-black p-6 shadow-[8px_8px_0px_#000] flex flex-col gap-4 font-mono ${
              isDark ? "bg-[#18191f] text-white" : "bg-[var(--white)] text-[var(--ink)]"
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Pencil size={18} />
                <h3 className="font-archivo font-black text-sm uppercase">Edit Brand Parameters</h3>
              </div>
              <button
                onClick={() => setShowEditBrandModal(false)}
                className="w-6 h-6 border-2 border-black bg-white text-black font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Tone &amp; Persona</label>
                <textarea
                  rows={2}
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value)}
                  className="w-full p-2.5 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Visual Guidelines Summary</label>
                <textarea
                  rows={2}
                  value={editVisualSummary}
                  onChange={(e) => setEditVisualSummary(e.target.value)}
                  className="w-full p-2.5 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Banned Terms (Comma-separated)</label>
                <input
                  type="text"
                  value={editBannedText}
                  onChange={(e) => setEditBannedText(e.target.value)}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Minimum WCAG Contrast</label>
                <input
                  type="number"
                  step="0.1"
                  value={editWcag}
                  onChange={(e) => setEditWcag(parseFloat(e.target.value))}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setShowEditBrandModal(false)}
                className="px-4 py-2 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingBrand}
                onClick={handleSaveBrandProfile}
                className="px-5 py-2 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black text-xs font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingBrand ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUAL RULE MODAL */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg border-4 border-black p-6 shadow-[8px_8px_0px_#000] flex flex-col gap-4 font-mono ${
              isDark ? "bg-[#18191f] text-white" : "bg-[var(--white)] text-[var(--ink)]"
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} />
                <h3 className="font-archivo font-black text-sm uppercase">Add Guideline Rule</h3>
              </div>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="w-6 h-6 border-2 border-black bg-white text-black font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase">Category</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value)}
                    className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                  >
                    <option value="TONE">TONE</option>
                    <option value="TERMINOLOGY">TERMINOLOGY</option>
                    <option value="ACCESSIBILITY">ACCESSIBILITY</option>
                    <option value="FACTUAL_CLAIM">FACTUAL_CLAIM</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase">Page Number</label>
                  <input
                    type="number"
                    value={rulePage}
                    onChange={(e) => setRulePage(parseInt(e.target.value, 10))}
                    className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Source Document</label>
                <input
                  type="text"
                  value={ruleSourceDoc}
                  onChange={(e) => setRuleSourceDoc(e.target.value)}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Section Reference</label>
                <input
                  type="text"
                  value={ruleSection}
                  onChange={(e) => setRuleSection(e.target.value)}
                  className="w-full h-9 px-3 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase">Rule Content *</label>
                <textarea
                  rows={3}
                  value={ruleContent}
                  onChange={(e) => setRuleContent(e.target.value)}
                  placeholder="e.g. Do not use absolute superlatives. Back resilience claims with empirical metrics."
                  className="w-full p-2.5 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setShowAddRuleModal(false)}
                className="px-4 py-2 border-2 border-black bg-white dark:bg-[#141518] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRule || !ruleContent.trim()}
                onClick={handleCreateRule}
                className="px-5 py-2 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black text-xs font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRule ? "Saving..." : "Commit Rule"}
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
        <div className="flex items-center justify-center min-h-[60vh] font-mono">
          <div className="flex flex-col items-center gap-2 p-6 border-3 border-black bg-[var(--yellow)] shadow-[4px_4px_0px_#000]">
            <Loader2 size={32} className="animate-spin text-black" />
            <span className="text-xs text-black font-black uppercase tracking-wider">
              Loading Brand Guidelines...
            </span>
          </div>
        </div>
      }
    >
      <BrandGuidelinesContent />
    </Suspense>
  );
}
