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
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-6 font-sans transition-colors ${
      isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#111827]"
    }`}>
      {/* Toast Notification with Lucide Icons */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 max-w-md transition-all ${
            notification.type === "success"
              ? isDark
                ? "bg-[#1b1b1f] border-[#00A36C]/40 text-white"
                : "bg-white border-[#00A36C]/40 text-[#111827]"
              : isDark
              ? "bg-[#1b1b1f] border-[#dc2626]/40 text-white"
              : "bg-white border-[#dc2626]/40 text-[#111827]"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={18} className="text-[#00A36C] shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-[#dc2626] shrink-0" />
          )}
          <p className="text-xs leading-snug flex-1">{notification.text}</p>
          <button
            onClick={() => setNotification(null)}
            className={`p-1 rounded-md cursor-pointer transition-colors ${
              isDark ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]" : "text-[#64748b] hover:text-[#111827] hover:bg-[#f1f5f9]"
            }`}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Ingestion & Semantic Search Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left: PDF Styleguide Ingestion Box (6 cols) */}
        <div className={`lg:col-span-6 rounded-xl p-5 border shadow-2xs flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Upload Brand Guide
              </h2>
              <span className={`text-[11px] font-mono ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                PDF format
              </span>
            </div>

            {/* Dropzone Container with Sharp High-Contrast Border */}
            <div className={`relative p-5 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
              isDark
                ? "bg-[#121316] border-[#3b3c44] hover:border-[#7c3aed]"
                : "bg-[#f8fafc] border-[#cbd5e1] hover:border-[#005797]"
            }`}>
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

              <UploadCloud
                size={28}
                className={`mb-2 transition-transform duration-200 group-hover:scale-105 ${
                  isDark ? "text-[#d2bbff]" : "text-[#005797]"
                }`}
              />

              <span className={`text-xs font-semibold mb-0.5 ${isDark ? "text-white" : "text-[#111827]"}`}>
                {uploadFile ? uploadFile.name : "Drag & drop styleguide PDF or browse"}
              </span>
              <p className={`text-[11px] ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                {uploadFile
                  ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Ready to parse`
                  : "PDF manuals, tone guides, or policy books"}
              </p>

              {uploadFile && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePdfUpload();
                  }}
                  className={`mt-3 z-30 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                      : "bg-[#005797] text-white hover:bg-[#004578]"
                  }`}
                >
                  {isUploading ? (
                    <Loader2 size={14} />
                  ) : (
                    <ArrowUpCircle size={14} />
                  )}
                  <span>{isUploading ? "Extracting..." : "Ingest PDF"}</span>
                </button>
              )}

              {uploadProgressMsg && (
                <span className={`mt-2 text-[11px] font-mono animate-pulse ${
                  isDark ? "text-[#d2bbff]" : "text-[#005797]"
                }`}>
                  {uploadProgressMsg}
                </span>
              )}
            </div>
          </div>

          {/* Active Source File Footer */}
          <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono ${
            isDark ? "border-[#313238] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
          }`}>
            <span className="truncate max-w-[280px]">
              Active: {chunks[0]?.source_document || "Blinkit Brand Voice & Tone Guide 2024.pdf"}
            </span>
            <button
              onClick={reloadGuidelines}
              type="button"
              className={`hover:underline flex items-center gap-1 cursor-pointer transition-colors ${
                isDark ? "text-[#d2bbff]" : "text-[#005797]"
              }`}
            >
              <RefreshCw size={12} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Right: Policy Semantic Search (6 cols) */}
        <div className={`lg:col-span-6 rounded-xl p-5 border shadow-2xs flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Policy Search
              </h2>
              <span className={`text-[11px] font-mono ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                Semantic match
              </span>
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className={`absolute left-2.5 top-2.5 pointer-events-none ${
                    isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rules, tone, claims, or accessibility..."
                  className={`w-full h-9 pl-8 pr-3 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#121316] border-[#3b3c44] text-white placeholder:text-[#9ca3af] focus:border-[#7c3aed]"
                      : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827] placeholder:text-[#64748b] focus:border-[#005797]"
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className={`h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    : "bg-[#005797] text-white hover:bg-[#004578]"
                }`}
              >
                {isSearching ? (
                  <Loader2 size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>{isSearching ? "Searching..." : "Search"}</span>
              </button>
            </form>

            {/* Results container */}
            {searchResults ? (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                <div className={`flex items-center justify-between text-[11px] font-mono pb-1 border-b ${
                  isDark ? "border-[#313238] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
                }`}>
                  <span>{searchResults.length} matches found</span>
                  <button
                    type="button"
                    onClick={() => setSearchResults(null)}
                    className="hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                      isDark ? "bg-[#121316] border-[#3b3c44]" : "bg-[#f8fafc] border-[#cbd5e1]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[10px] font-bold uppercase ${
                        isDark ? "text-[#d2bbff]" : "text-[#005797]"
                      }`}>
                        {res.chunk.rule_category}
                      </span>
                      <span className="font-mono text-[10px] text-[#00A36C] font-bold">
                        {(res.similarity_score * 100).toFixed(1)}% Match
                      </span>
                    </div>
                    <p className={`line-clamp-2 leading-relaxed ${isDark ? "text-[#d1d5db]" : "text-[#374151]"}`}>
                      {res.chunk.content_text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 rounded-lg border border-dashed text-center text-xs ${
                isDark ? "border-[#313238] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
              }`}>
                Enter any query above to test real-time guideline matching.
              </div>
            )}
          </div>

          <div className={`mt-3 pt-2.5 border-t text-[11px] font-mono ${
            isDark ? "border-[#313238] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
          }`}>
            Target Brand: <span className="font-semibold text-[#00A36C]">{activeBrand?.name}</span>
          </div>
        </div>
      </div>

      {/* 2. High-Contrast Tabbed Policy Inspector */}
      <div className="flex flex-col gap-5">
        {/* Navigation Tabs Bar & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className={`flex items-center gap-1.5 p-1 rounded-xl border max-w-full overflow-x-auto ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
          }`}>
          <button
            type="button"
            onClick={() => setActiveTab("CHUNKS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "CHUNKS"
                ? isDark
                  ? "bg-[#7c3aed] text-white shadow-2xs"
                  : "bg-[#005797] text-white shadow-2xs"
                : isDark
                ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]"
                : "text-[#64748b] hover:text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <BookOpen size={14} />
            <span>Brand Rules</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeTab === "CHUNKS"
                ? "bg-white/20 text-white"
                : isDark ? "bg-[#292a2d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]"
            }`}>
              {chunks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TERMINOLOGY")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "TERMINOLOGY"
                ? isDark
                  ? "bg-[#7c3aed] text-white shadow-2xs"
                  : "bg-[#005797] text-white shadow-2xs"
                : isDark
                ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]"
                : "text-[#64748b] hover:text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <Languages size={14} />
            <span>Terminology</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeTab === "TERMINOLOGY"
                ? "bg-white/20 text-white"
                : isDark ? "bg-[#292a2d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]"
            }`}>
              {preferredTermEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANNED")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "BANNED"
                ? isDark
                  ? "bg-[#7c3aed] text-white shadow-2xs"
                  : "bg-[#005797] text-white shadow-2xs"
                : isDark
                ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]"
                : "text-[#64748b] hover:text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <Ban size={14} />
            <span>Banned Terms</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              activeTab === "BANNED"
                ? "bg-white/20 text-white"
                : isDark ? "bg-[#292a2d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]"
            }`}>
              {bannedTermsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VISUAL")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "VISUAL"
                ? isDark
                  ? "bg-[#7c3aed] text-white shadow-2xs"
                  : "bg-[#005797] text-white shadow-2xs"
                : isDark
                ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]"
                : "text-[#64748b] hover:text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <Palette size={14} />
            <span>Visual Identity</span>
          </button>
        </div>

        {/* Action Button Palette with Lucide Icons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setShowAddRuleModal(true)}
            type="button"
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold border shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
                : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <PlusCircle size={15} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
            <span>Add Rule</span>
          </button>

          <button
            onClick={openEditBrandModal}
            type="button"
            className={`h-9 px-3 rounded-lg text-xs font-semibold border shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
                : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <Pencil size={15} className={isDark ? "text-[#9ca3af]" : "text-[#64748b]"} />
            <span>Edit Brand</span>
          </button>

          <button
            onClick={() => setShowCreateBrandModal(true)}
            type="button"
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              isDark
                ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                : "bg-[#005797] hover:bg-[#004578] text-white"
            }`}
          >
            <Building2 size={15} />
            <span>New Brand</span>
          </button>
        </div>
      </div>

        {/* TAB 1: BRAND RULES */}
        {activeTab === "CHUNKS" && (
          <div className="flex flex-col gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {Object.keys(categoryCounts).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setChunkFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    chunkFilter === cat
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] border-[#7c3aed] font-bold"
                        : "bg-[#ebf6ff] text-[#005797] border-[#005797] font-bold"
                      : isDark
                      ? "bg-[#1b1b1f] border-[#3b3c44] text-[#9ca3af] hover:text-white"
                      : "bg-white border-[#cbd5e1] text-[#64748b] hover:text-[#111827]"
                  }`}
                >
                  {cat} ({categoryCounts[cat]})
                </button>
              ))}
            </div>

            {/* Rules Grid (Sharp High-Contrast Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingChunks ? (
                <div className={`col-span-2 py-12 text-center text-xs font-mono ${
                  isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                }`}>
                  Loading guideline rules...
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className={`col-span-2 py-12 text-center text-xs rounded-xl border border-dashed ${
                  isDark ? "border-[#3b3c44] text-[#9ca3af]" : "border-[#cbd5e1] text-[#64748b]"
                }`}>
                  No rules found for this category.
                </div>
              ) : (
                filteredChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className={`rounded-xl p-5 border shadow-2xs flex flex-col justify-between gap-3 transition-colors ${
                      isDark
                        ? "bg-[#1b1b1f] border-[#3b3c44] hover:border-[#4f515c]"
                        : "bg-white border-[#cbd5e1] hover:border-[#94a3b8]"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                            chunk.rule_category === "TONE"
                              ? isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-purple-50 text-purple-700"
                              : chunk.rule_category === "TERMINOLOGY"
                              ? isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-700"
                              : chunk.rule_category === "ACCESSIBILITY"
                              ? isDark ? "bg-[#00A36C]/20 text-[#4edea3]" : "bg-emerald-50 text-emerald-700"
                              : isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {chunk.rule_category}
                        </span>
                        <span className={`text-[10px] font-mono ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                          Triggered: {chunk.times_triggered}x
                        </span>
                      </div>

                      <p className={`text-xs leading-relaxed font-sans ${isDark ? "text-white" : "text-[#111827]"}`}>
                        {chunk.content_text}
                      </p>
                    </div>

                    <div className={`flex items-center justify-between text-[10px] font-mono pt-2 border-t ${
                      isDark ? "border-[#313238] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
                    }`}>
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
            <div className={`xl:col-span-8 rounded-xl border shadow-2xs overflow-hidden transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}>
              <div className={`grid grid-cols-12 gap-2 px-4 py-2.5 font-mono text-[10px] uppercase font-semibold border-b ${
                isDark ? "bg-[#121316] text-[#9ca3af] border-[#3b3c44]" : "bg-[#f8fafc] text-[#64748b] border-[#cbd5e1]"
              }`}>
                <div className="col-span-5">Canonical Preferred Term</div>
                <div className="col-span-5">Avoid / Deprecated</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              <div className={`divide-y text-xs ${isDark ? "divide-[#313238]" : "divide-[#e2e8f0]"}`}>
                {preferredTermEntries.length === 0 ? (
                  <div className={`p-8 text-center ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                    No preferred terminology defined for this brand.
                  </div>
                ) : (
                  preferredTermEntries.map(([deprecated, canonical]) => (
                    <div
                      key={deprecated}
                      className={`grid grid-cols-12 gap-2 p-3.5 items-center transition-colors ${
                        isDark ? "hover:bg-[#1f1f23]" : "hover:bg-[#f8fafc]"
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[#00A36C] shrink-0" />
                        <span className={`font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>{canonical}</span>
                      </div>
                      <div className="col-span-5 flex items-center gap-2">
                        <XCircle size={15} className="text-[#dc2626] shrink-0" />
                        <span className={`line-through font-mono text-[11px] ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
                          {deprecated}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#00A36C]/20 text-[#00A36C]">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right 4 cols: Quick Add Terminology */}
            <div className={`xl:col-span-4 rounded-xl p-5 border shadow-2xs flex flex-col gap-3 transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Add Terminology
              </h3>

              <div className="flex flex-col gap-2.5">
                <div>
                  <label className={`text-[10px] uppercase font-mono font-semibold block mb-1 ${
                    isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                  }`}>
                    Avoid Phrase:
                  </label>
                  <input
                    type="text"
                    value={quickTermKey}
                    onChange={(e) => setQuickTermKey(e.target.value)}
                    placeholder="e.g. delivery boy"
                    className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                      isDark
                        ? "bg-[#121316] border-[#3b3c44] text-white focus:border-[#7c3aed]"
                        : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827] focus:border-[#005797]"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[10px] uppercase font-mono font-semibold block mb-1 ${
                    isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                  }`}>
                    Preferred Replacement:
                  </label>
                  <input
                    type="text"
                    value={quickTermVal}
                    onChange={(e) => setQuickTermVal(e.target.value)}
                    placeholder="e.g. delivery partner"
                    className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                      isDark
                        ? "bg-[#121316] border-[#3b3c44] text-white focus:border-[#7c3aed]"
                        : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827] focus:border-[#005797]"
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPreferredTerm}
                  disabled={!quickTermKey.trim() || !quickTermVal.trim()}
                  className={`mt-1 w-full py-2 rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                      : "bg-[#005797] hover:bg-[#004578] text-white"
                  }`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bannedTermsList.map((term) => (
                  <div
                    key={term}
                    className={`p-3.5 rounded-xl border shadow-2xs flex items-center justify-between transition-colors ${
                      isDark ? "bg-[#1b1b1f] border-[#dc2626]/30" : "bg-white border-[#dc2626]/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
                      <span className={`font-mono text-xs font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>
                        “{term}”
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#dc2626]/20 text-[#dc2626]">
                      BANNED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 4 cols: Quick Add Banned Term */}
            <div className={`xl:col-span-4 rounded-xl p-5 border shadow-2xs flex flex-col gap-3 transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                Add Banned Term
              </h3>

              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  value={quickBannedTerm}
                  onChange={(e) => setQuickBannedTerm(e.target.value)}
                  placeholder="e.g. unhackable, guaranteed, 100% free"
                  className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#121316] border-[#3b3c44] text-white focus:border-[#dc2626]"
                      : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827] focus:border-[#dc2626]"
                  }`}
                />

                <button
                  type="button"
                  onClick={handleAddBannedTerm}
                  disabled={!quickBannedTerm.trim()}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Save Banned Term
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VISUAL IDENTITY */}
        {activeTab === "VISUAL" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Swatches Card */}
            <div className={`p-5 rounded-xl border shadow-2xs flex flex-col gap-4 transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette size={16} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
                  <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                    Approved Palette
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-[#00A36C] font-semibold">
                  WCAG Contrast: {activeBrand?.min_wcag_contrast || 4.5}:1
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {paletteList.map((hex) => (
                  <div
                    key={hex}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border shadow-2xs ${
                      isDark ? "bg-[#121316] border-[#3b3c44]" : "bg-[#f8fafc] border-[#cbd5e1]"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-lg shadow-inner border border-black/10"
                      style={{ backgroundColor: hex }}
                    />
                    <span className={`font-mono text-[11px] font-bold uppercase ${
                      isDark ? "text-white" : "text-[#111827]"
                    }`}>
                      {hex}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                isDark ? "bg-[#121316] border-[#3b3c44] text-[#d1d5db]" : "bg-[#f8fafc] border-[#cbd5e1] text-[#4b5563]"
              }`}>
                <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs">
                  <Sliders size={13} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
                  <span className={isDark ? "text-white" : "text-[#111827]"}>Visual Summary</span>
                </div>
                {activeBrand?.visual_guidelines_summary ||
                  "Ensure all interactive UI elements meet minimum 4.5:1 contrast against dark background."}
              </div>
            </div>

            {/* Tone Persona Card */}
            <div className={`p-5 rounded-xl border shadow-2xs flex flex-col gap-4 transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
                <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                  Tone & Editorial Voice
                </h3>
              </div>

              <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                isDark ? "bg-[#121316] border-[#3b3c44] text-[#d1d5db]" : "bg-[#f8fafc] border-[#cbd5e1] text-[#4b5563]"
              }`}>
                {activeBrand?.tone_persona || "Clear, authoritative, empathetic, and evidence-backed."}
              </div>

              <div className={`flex flex-col gap-2 font-mono text-[11px] pt-2 border-t ${
                isDark ? "border-[#313238] text-[#9ca3af]" : "border-[#e2e8f0] text-[#64748b]"
              }`}>
                <div className="flex items-center justify-between">
                  <span>Industry Sector:</span>
                  <span className={`font-semibold ${isDark ? "text-white" : "text-[#111827]"}`}>
                    {activeBrand?.industry}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Registered:</span>
                  <span className={isDark ? "text-white" : "text-[#111827]"}>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border flex flex-col gap-4 ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44] text-white" : "bg-white border-[#cbd5e1] text-[#111827]"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-[#313238]" : "border-[#e2e8f0]"
            }`}>
              <div className="flex items-center gap-2">
                <Building2 size={18} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
                <h3 className="text-sm font-bold">Create Brand</h3>
              </div>
              <button
                onClick={() => setShowCreateBrandModal(false)}
                className={`p-1 rounded-md cursor-pointer transition-colors ${isDark ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]" : "text-[#64748b] hover:text-[#111827] hover:bg-[#f1f5f9]"}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Brand Name:</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. CyberDefense Global"
                  className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Industry:</label>
                <input
                  type="text"
                  value={newBrandIndustry}
                  onChange={(e) => setNewBrandIndustry(e.target.value)}
                  placeholder="e.g. Enterprise Security"
                  className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Tone Persona:</label>
                <textarea
                  value={newBrandTone}
                  onChange={(e) => setNewBrandTone(e.target.value)}
                  placeholder="e.g. Authoritative, direct, research-backed."
                  className={`w-full h-18 p-2.5 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Approved Palette (Hex comma-separated):</label>
                <input
                  type="text"
                  value={newBrandPalette}
                  onChange={(e) => setNewBrandPalette(e.target.value)}
                  className={`w-full h-9 px-3 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Banned Terms (Comma-separated):</label>
                <input
                  type="text"
                  value={newBrandBanned}
                  onChange={(e) => setNewBrandBanned(e.target.value)}
                  className={`w-full h-9 px-3 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Minimum WCAG Contrast:</label>
                <input
                  type="number"
                  step="0.1"
                  value={newBrandWcag}
                  onChange={(e) => setNewBrandWcag(parseFloat(e.target.value))}
                  className={`w-full h-9 px-3 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
              isDark ? "border-[#313238]" : "border-[#e2e8f0]"
            }`}>
              <button
                type="button"
                onClick={() => setShowCreateBrandModal(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  isDark
                    ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
                    : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBrand || !newBrandName.trim()}
                onClick={handleCreateBrand}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    : "bg-[#005797] text-white hover:bg-[#004578]"
                }`}
              >
                {isSubmittingBrand ? "Creating..." : "Save Brand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {showEditBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border flex flex-col gap-4 ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44] text-white" : "bg-white border-[#cbd5e1] text-[#111827]"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-[#313238]" : "border-[#e2e8f0]"
            }`}>
              <div className="flex items-center gap-2">
                <Pencil size={18} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
                <h3 className="text-sm font-bold">Edit Brand</h3>
              </div>
              <button
                onClick={() => setShowEditBrandModal(false)}
                className={`p-1 rounded-md cursor-pointer transition-colors ${isDark ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]" : "text-[#64748b] hover:text-[#111827] hover:bg-[#f1f5f9]"}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Tone Persona:</label>
                <textarea
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value)}
                  className={`w-full h-20 p-2.5 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Visual Summary:</label>
                <textarea
                  value={editVisualSummary}
                  onChange={(e) => setEditVisualSummary(e.target.value)}
                  className={`w-full h-18 p-2.5 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Banned Terms (Comma-separated):</label>
                <input
                  type="text"
                  value={editBannedText}
                  onChange={(e) => setEditBannedText(e.target.value)}
                  className={`w-full h-9 px-3 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Minimum WCAG Contrast:</label>
                <input
                  type="number"
                  step="0.1"
                  value={editWcag}
                  onChange={(e) => setEditWcag(parseFloat(e.target.value))}
                  className={`w-full h-9 px-3 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
              isDark ? "border-[#313238]" : "border-[#e2e8f0]"
            }`}>
              <button
                type="button"
                onClick={() => setShowEditBrandModal(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  isDark
                    ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
                    : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingBrand}
                onClick={handleSaveBrandProfile}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    : "bg-[#005797] text-white hover:bg-[#004578]"
                }`}
              >
                {isSavingBrand ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUAL RULE MODAL */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border flex flex-col gap-4 ${
            isDark ? "bg-[#1b1b1f] border-[#3b3c44] text-white" : "bg-white border-[#cbd5e1] text-[#111827]"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-[#313238]" : "border-[#e2e8f0]"
            }`}>
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className={isDark ? "text-[#d2bbff]" : "text-[#005797]"} />
                <h3 className="text-sm font-bold">Add Guideline Rule</h3>
              </div>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className={`p-1 rounded-md cursor-pointer transition-colors ${isDark ? "text-[#9ca3af] hover:text-white hover:bg-[#292a2d]" : "text-[#64748b] hover:text-[#111827] hover:bg-[#f1f5f9]"}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Category:</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value)}
                    className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                      isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                    }`}
                  >
                    <option value="TONE">TONE</option>
                    <option value="TERMINOLOGY">TERMINOLOGY</option>
                    <option value="ACCESSIBILITY">ACCESSIBILITY</option>
                    <option value="FACTUAL_CLAIM">FACTUAL_CLAIM</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Page Number:</label>
                  <input
                    type="number"
                    value={rulePage}
                    onChange={(e) => setRulePage(parseInt(e.target.value, 10))}
                    className={`w-full h-9 px-3 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                      isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Source Document:</label>
                <input
                  type="text"
                  value={ruleSourceDoc}
                  onChange={(e) => setRuleSourceDoc(e.target.value)}
                  className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Section Reference:</label>
                <input
                  type="text"
                  value={ruleSection}
                  onChange={(e) => setRuleSection(e.target.value)}
                  className={`w-full h-9 px-3 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}>Rule Content:</label>
                <textarea
                  value={ruleContent}
                  onChange={(e) => setRuleContent(e.target.value)}
                  placeholder="e.g. Do not use absolute superlatives. Back resilience claims with empirical metrics."
                  className={`w-full h-20 p-2.5 rounded-lg text-xs border transition-all focus:outline-none ${
                    isDark ? "bg-[#121316] border-[#3b3c44] text-white" : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827]"
                  }`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
              isDark ? "border-[#313238]" : "border-[#e2e8f0]"
            }`}>
              <button
                type="button"
                onClick={() => setShowAddRuleModal(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  isDark
                    ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
                    : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRule || !ruleContent.trim()}
                onClick={handleCreateRule}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    : "bg-[#005797] text-white hover:bg-[#004578]"
                }`}
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="text-[#005797] dark:text-[#7c3aed]" />
            <span className="text-xs text-[#64748b] dark:text-[#9ca3af] font-mono">Loading Brand Guidelines...</span>
          </div>
        </div>
      }
    >
      <BrandGuidelinesContent />
    </Suspense>
  );
}
