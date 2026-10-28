"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { PackSummary, UserRole, BrandProfile } from "@/lib/types";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SelectClientHeading } from "@/components/onboarding/SelectClientHeading";
import { ClientSelectionLayout } from "@/components/onboarding/ClientSelectionLayout";

export default function OnboardingPage() {
  const router = useRouter();
  const {
    brands,
    activeBrandId,
    setActiveBrandId,
    refreshBrands,
    refreshCampaigns,
    loginAsDemoUser,
    theme,
    toggleTheme,
    currentRole,
  } = useApp();

  useEffect(() => {
    if (currentRole === "CREATOR") {
      router.replace("/content");
    }
  }, [currentRole, router]);

  const isDark = theme === "dark";

  // Wizard state: 1: Client -> 2: Ingestion -> 3: Rules
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Client Selection
  const [clientType, setClientType] = useState<"blinkit" | "custom">("blinkit");
  const [customBrandName, setCustomBrandName] = useState("");
  const customIndustry = "Retail & E-Commerce";
  const [customTone, setCustomTone] = useState("Vibrant, youthful, reliable, customer-obsessed");

  // Step 2: Guidelines Ingestion
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [guidelineFile, setGuidelineFile] = useState<File | null>(null);
  const [ingestionStats, setIngestionStats] = useState<{
    documentsIndexed: number;
    chunksCreated: number;
    campaignName?: string;
  } | null>(null);

  // Step 3: Extracted RuleSet
  const [extractedRules, setExtractedRules] = useState<{
    palette: string[];
    bannedTerms: string[];
    preferredTerms: Record<string, string>;
    requiredCues: string[];
    decisionRules: Record<string, unknown>;
  }>({
    palette: ["#F8C200", "#00A36C", "#1C1C1E", "#FFFFFF"],
    bannedTerms: ["10-minute guarantee", "instant delivery guaranteed", "cheapest prices", "miracle", "foolproof"],
    preferredTerms: {
      "delivery boy": "delivery partner",
      "hyperlocal": "quick commerce",
      "free stuff": "complimentary offer",
    },
    requiredCues: ["Diwali", "festive lights", "family celebration", "quick delivery"],
    decisionRules: {
      palette_threshold: 0.8,
      require_contrast_check: true,
      required_cues_minimum: 2,
    },
  });

  const [newColor, setNewColor] = useState("#");
  const [newBannedTerm, setNewBannedTerm] = useState("");
  const [newPrefKey, setNewPrefKey] = useState("");
  const [newPrefVal, setNewPrefVal] = useState("");



  // Load available packs on mount
  useEffect(() => {
    async function initPacks() {
      try {
        const p = await api.listPacks();
        setPacks(p);
      } catch {
        // Fallback default pack
        setPacks([
          {
            name: "blinkit",
            brand_name: "Blinkit",
            industry: "Quick Commerce",
            description: "Complete Diwali 2026 brand identity & campaign governance guidelines.",
            documents: ["blinkit_brand_guidelines.pdf", "blinkit_diwali_campaign_brief.md"],
            campaign_name: "Blinkit Diwali 2026 Flash Sale",
          },
        ]);
      }
    }
    initPacks();
  }, []);

  // Handlers
  const ensureBlinkitBrand = async (): Promise<BrandProfile> => {
    let blinkit = brands.find((b) => b.name.toLowerCase() === "blinkit");
    if (blinkit) return blinkit;

    // Check directly from backend if state was still empty
    const currentList = await api.listBrands().catch(() => []);
    blinkit = currentList.find((b) => b.name.toLowerCase() === "blinkit");
    if (blinkit) {
      await refreshBrands();
      return blinkit;
    }

    try {
      const created = await api.createBrand({
        name: "Blinkit",
        industry: "Quick Commerce",
        tone_persona: "Energetic, fast, friendly, culturally connected, reliable",
        approved_hex_palette: ["#F8C200", "#00A36C", "#1C1C1E", "#FFFFFF"],
        banned_terms: ["10-minute guarantee", "instant delivery guaranteed", "cheapest prices"],
        preferred_terminology: { "delivery boy": "delivery partner", "hyperlocal": "quick commerce" },
        min_wcag_contrast: 4.5,
      });
      await refreshBrands();
      return created;
    } catch {
      // If brand already exists or created concurrently, retrieve it safely
      const retryList = await api.listBrands().catch(() => []);
      const found = retryList.find((b) => b.name.toLowerCase() === "blinkit");
      if (found) {
        await refreshBrands();
        return found;
      }
      throw new Error("Unable to locate or connect to Blinkit workspace.");
    }
  };

  const handleStep1Submit = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (clientType === "blinkit") {
        const blinkit = await ensureBlinkitBrand();
        setActiveBrandId(blinkit.id);
      } else {
        const brandName = customBrandName.trim();
        if (!brandName) {
          throw new Error("Please enter a brand name.");
        }
        let existing = brands.find((b) => b.name.toLowerCase() === brandName.toLowerCase());
        if (!existing) {
          const currentList = await api.listBrands().catch(() => []);
          existing = currentList.find((b) => b.name.toLowerCase() === brandName.toLowerCase());
        }
        if (existing) {
          setActiveBrandId(existing.id);
        } else {
          try {
            const created = await api.createBrand({
              name: brandName,
              industry: customIndustry,
              tone_persona: customTone,
              approved_hex_palette: ["#2563EB", "#1E293B", "#F8FAFC"],
              banned_terms: ["unbeatable guarantee"],
              preferred_terminology: {},
              min_wcag_contrast: 4.5,
            });
            await refreshBrands();
            setActiveBrandId(created.id);
          } catch {
            const retryList = await api.listBrands().catch(() => []);
            const found = retryList.find((b) => b.name.toLowerCase() === brandName.toLowerCase());
            if (found) {
              await refreshBrands();
              setActiveBrandId(found.id);
            } else {
              throw new Error(`Failed to configure brand '${brandName}'.`);
            }
          }
        }
      }
      setCurrentStep(2);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to configure brand.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPremadePack = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      let brandId = activeBrandId;
      if (!brandId) {
        const blinkit = await ensureBlinkitBrand();
        brandId = blinkit.id;
        setActiveBrandId(blinkit.id);
      }

      const res = await api.loadPack("blinkit", brandId);
      const docsCount = res.documents_indexed || res.indexed_chunks_count || 3;
      const chunksCount = res.chunks_created || res.indexed_chunks_count || 110;
      setIngestionStats({
        documentsIndexed: docsCount,
        chunksCreated: chunksCount,
        campaignName: "Blinkit Diwali 2026",
      });
      setSuccessMessage(`Successfully ingested premade pack: ${chunksCount} policy chunks indexed!`);

      // Try extracting rules from backend
      try {
        if (brandId) {
          const ruleSet = await api.extractRules(brandId);
          if (ruleSet) {
            setExtractedRules((prev) => ({
              ...prev,
              palette: (ruleSet.palette as string[]) || (ruleSet.decision_rules?.palette as string[]) || prev.palette,
              bannedTerms: (ruleSet.banned_terms as string[]) || (ruleSet.decision_rules?.banned_terms as string[]) || prev.bannedTerms,
              preferredTerms: (ruleSet.preferred_terminology as Record<string, string>) || (ruleSet.decision_rules?.preferred_terminology as Record<string, string>) || prev.preferredTerms,
            }));
          }
        }
      } catch {
        // Fallback to default extracted rules
      }

      await refreshCampaigns();
      setCurrentStep(3);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load premade pack.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCustomGuideline = async () => {
    if (!guidelineFile || !activeBrandId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const chunks = await api.uploadGuidelinePdf(activeBrandId, guidelineFile);
      setIngestionStats({
        documentsIndexed: 1,
        chunksCreated: chunks.length,
      });
      setSuccessMessage(`Ingested ${chunks.length} chunks from ${guidelineFile.name}!`);

      // Extract rules from document
      try {
        const ruleSet = await api.extractRules(activeBrandId);
        if (ruleSet?.decision_rules) {
          setExtractedRules((prev) => ({
            ...prev,
            palette: (ruleSet.decision_rules.palette as string[]) || prev.palette,
            bannedTerms: (ruleSet.decision_rules.banned_terms as string[]) || prev.bannedTerms,
            preferredTerms: (ruleSet.decision_rules.preferred_terminology as Record<string, string>) || prev.preferredTerms,
          }));
        }
      } catch {
        // Keep current rules
      }

      setCurrentStep(3);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload guideline.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRulesAndProceed = async (destination: string = "/dashboard") => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let brandId = activeBrandId;
      if (!brandId) {
        const found = brands.find((b) => b.name.toLowerCase() === "blinkit") || brands[0];
        if (found) {
          brandId = found.id;
          setActiveBrandId(found.id);
        }
      }
      if (brandId) {
        await api.createRuleset(brandId, {
          brand_id: brandId,
          decision_rules: {
            palette: extractedRules.palette,
            banned_terms: extractedRules.bannedTerms,
            preferred_terminology: extractedRules.preferredTerms,
            required_cues: extractedRules.requiredCues,
            ...extractedRules.decisionRules,
          },
          dimension_weights: {
            visual_identity: 0.25,
            campaign_fit: 0.25,
            tone_voice: 0.2,
            factual_accuracy: 0.15,
            accessibility: 0.15,
          },
          is_active: true,
        });

        // Sync brand profile deterministic attributes
        await api.updateBrand(brandId, {
          approved_hex_palette: extractedRules.palette,
          banned_terms: extractedRules.bannedTerms,
          preferred_terminology: extractedRules.preferredTerms,
        });
        await refreshBrands();
      }
      try {
        localStorage.setItem("inkloom_setup_completed", "true");
      } catch {}
      router.push(destination);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save rule set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`onboarding-root min-h-screen flex flex-col font-sans selection:bg-[#635BFF] selection:text-white transition-colors duration-200 ${
        isDark ? "bg-[#0d0e12] text-[#e3e2e6]" : "bg-[#FAF9FE] text-[#111827]"
      }`}
      style={{
        fontFamily:
          'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Redesigned Enterprise Top Bar */}
      <OnboardingHeader theme={theme} toggleTheme={toggleTheme} />

      {/* Centered Wizard Progress Bar */}
      <OnboardingProgress
        currentStep={currentStep}
        onStepClick={(step) => setCurrentStep(step)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full mx-auto flex flex-col justify-start">
        {/* Error / Success Notifications */}
        <div className="max-w-3xl w-full mx-auto px-4 mt-3">
          {errorMessage && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center justify-between shadow-2xs">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 font-bold ml-4 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center justify-between shadow-2xs">
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-700 font-bold ml-4 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* STEP 1: SELECT CLIENT (Redesigned Enterprise UI) */}
        {currentStep === 1 && (
          <section className="w-full flex flex-col items-center">
            <SelectClientHeading />
            <ClientSelectionLayout
              clientType={clientType}
              setClientType={setClientType}
              customBrandName={customBrandName}
              setCustomBrandName={setCustomBrandName}
              customTone={customTone}
              setCustomTone={setCustomTone}
              guidelineFile={guidelineFile}
              setGuidelineFile={setGuidelineFile}
              onContinue={handleStep1Submit}
              loading={loading}
            />
          </section>
        )}

        {/* STEPS 2, 3, 4 CONTAINER */}
        {currentStep > 1 && (
          <div className="max-w-5xl w-full mx-auto px-4 py-8">
        {/* STEP 2: INGEST GUIDELINES */}
        {currentStep === 2 && (
          <div
            className={`p-6 sm:p-8 rounded-2xl border shadow-xl transition-all ${
              isDark ? "bg-[#14151c] border-[#2b2c36]" : "bg-white border-[#e2e8f0]"
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c3aed] bg-[#7c3aed]/10 px-3 py-1 rounded-full">
                Step 2 of 3
              </span>
              <h2 className="text-2xl font-black mt-3 mb-2 tracking-tight">Ingest Brand Guidelines</h2>
              <p className={`text-sm ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                Load the pre-indexed Blinkit Diwali 2026 pack or upload custom PDFs for RAG semantic indexing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
              {/* Option A: 1-Click Premade Pack */}
              <div
                className={`p-6 rounded-xl border flex flex-col justify-between ${
                  isDark ? "bg-[#1a1b24] border-[#2b2c36]" : "bg-slate-50 border-[#e2e8f0]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⚡</span>
                    <h3 className="font-bold text-base">Blinkit Diwali 2026 Pack</h3>
                    {packs.length > 0 && (
                      <span className="ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {packs[0].name}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mb-4 ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Indexes official brand visual guidelines, color palette specifications, font rules, tone parameters,
                    and Diwali festive campaign brief into pgvector.
                  </p>
                  <div className={`p-3 rounded-lg text-xs space-y-1 mb-4 ${isDark ? "bg-[#121319]" : "bg-white border"}`}>
                    <div className="text-[11px] font-mono text-[#94a3b8]">✓ blinkit_brand_guidelines.pdf</div>
                    <div className="text-[11px] font-mono text-[#94a3b8]">✓ blinkit_diwali_campaign_brief.md</div>
                    <div className="text-[11px] font-mono text-[#94a3b8]">✓ 12+ RAG guideline chunks with pgvector embeddings</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleLoadPremadePack}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#F8C200] hover:bg-[#e5b300] text-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Indexing Pack..." : "🚀 Load Blinkit Pack (1-Click)"}
                </button>
              </div>

              {/* Option B: Upload Document */}
              <div
                className={`p-6 rounded-xl border flex flex-col justify-between ${
                  isDark ? "bg-[#1a1b24] border-[#2b2c36]" : "bg-slate-50 border-[#e2e8f0]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📄</span>
                    <h3 className="font-bold text-base">Upload Custom Guidelines</h3>
                  </div>
                  <p className={`text-xs mb-4 ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Upload a PDF or Markdown file. Our RAG engine extracts text, generates 768-dim embeddings, and
                    automatically structures governance rules.
                  </p>

                  <label
                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      guidelineFile
                        ? "border-[#7c3aed] bg-[#7c3aed]/5"
                        : isDark
                        ? "border-[#2b2c36] hover:border-[#3b3c48]"
                        : "border-[#cbd5e1] hover:border-[#94a3b8]"
                    }`}
                  >
                    <span className="text-2xl mb-1">📁</span>
                    <span className="text-xs font-semibold text-center truncate max-w-[200px]">
                      {guidelineFile ? guidelineFile.name : "Choose PDF or Markdown"}
                    </span>
                    <span className="text-[10px] text-[#94a3b8] mt-0.5">Up to 25MB</span>
                    <input
                      type="file"
                      accept=".pdf,.md,.txt"
                      onChange={(e) => setGuidelineFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={!guidelineFile || loading}
                  onClick={handleUploadCustomGuideline}
                  className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Uploading & Indexing..." : "Upload & Extract Rules →"}
                </button>
              </div>
            </div>

            <div className="flex justify-between max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? "text-[#94a3b8] hover:text-white" : "text-[#64748b] hover:text-black"
                }`}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & EDIT RULESET */}
        {currentStep === 3 && (
          <div
            className={`p-6 sm:p-8 rounded-2xl border shadow-xl transition-all ${
              isDark ? "bg-[#14151c] border-[#2b2c36]" : "bg-white border-[#e2e8f0]"
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c3aed] bg-[#7c3aed]/10 px-3 py-1 rounded-full">
                Step 3 of 3
              </span>
              <h2 className="text-2xl font-black mt-3 mb-2 tracking-tight">Review Extracted RuleSet</h2>
              <p className={`text-sm ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                Review and fine-tune the deterministic governance rules extracted from guidelines before activating audits.
              </p>
              {ingestionStats && (
                <div className="mt-2 text-xs font-semibold text-emerald-500">
                  ✓ Indexed {ingestionStats.chunksCreated} chunks from {ingestionStats.documentsIndexed} source documents
                </div>
              )}
            </div>

            <div className="space-y-6 max-w-3xl mx-auto mb-8">
              {/* Approved Color Palette Swatches */}
              <div className={`p-4 rounded-xl border ${isDark ? "bg-[#1a1b24] border-[#2b2c36]" : "bg-slate-50 border-[#e2e8f0]"}`}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94a3b8] mb-3">
                  Approved Color Palette (Hex)
                </h4>
                <div className="flex flex-wrap items-center gap-2.5">
                  {extractedRules.palette.map((color, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium ${
                        isDark ? "bg-[#121319] border-[#2b2c36]" : "bg-white border-[#cbd5e1]"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0 shadow-2xs"
                        style={{ backgroundColor: color }}
                      />
                      <span>{color}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExtractedRules((prev) => ({
                            ...prev,
                            palette: prev.palette.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-red-400 hover:text-red-600 font-bold ml-1 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="#HEX"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className={`w-20 px-2 py-1 rounded-lg text-xs font-mono border focus:outline-none ${
                        isDark ? "bg-[#121319] border-[#2b2c36] text-white" : "bg-white border-[#cbd5e1]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                          setExtractedRules((prev) => ({
                            ...prev,
                            palette: [...prev.palette, newColor.toUpperCase()],
                          }));
                          setNewColor("#");
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Banned Terms */}
              <div className={`p-4 rounded-xl border ${isDark ? "bg-[#1a1b24] border-[#2b2c36]" : "bg-slate-50 border-[#e2e8f0]"}`}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94a3b8] mb-3">
                  Banned Terminology (Zero Tolerance)
                </h4>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {extractedRules.bannedTerms.map((term, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExtractedRules((prev) => ({
                            ...prev,
                            bannedTerms: prev.bannedTerms.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-red-400 hover:text-red-600 font-bold text-sm"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add banned term (e.g. instant delivery guaranteed)"
                    value={newBannedTerm}
                    onChange={(e) => setNewBannedTerm(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                      isDark ? "bg-[#121319] border-[#2b2c36] text-white" : "bg-white border-[#cbd5e1]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newBannedTerm.trim()) {
                        setExtractedRules((prev) => ({
                          ...prev,
                          bannedTerms: [...prev.bannedTerms, newBannedTerm.trim()],
                        }));
                        setNewBannedTerm("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Preferred Terminology */}
              <div className={`p-4 rounded-xl border ${isDark ? "bg-[#1a1b24] border-[#2b2c36]" : "bg-slate-50 border-[#e2e8f0]"}`}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94a3b8] mb-3">
                  Preferred Terminology Replacements
                </h4>
                <div className="space-y-2 mb-3">
                  {Object.entries(extractedRules.preferredTerms).map(([bad, good], idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border ${
                        isDark ? "bg-[#121319] border-[#2b2c36]" : "bg-white border-[#cbd5e1]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="line-through text-red-400">{bad}</span>
                        <span className="text-[#94a3b8]">→</span>
                        <span className="font-semibold text-emerald-400">{good}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...extractedRules.preferredTerms };
                          delete updated[bad];
                          setExtractedRules((prev) => ({ ...prev, preferredTerms: updated }));
                        }}
                        className="text-red-400 hover:text-red-600 font-bold ml-2 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Deprecated (e.g. delivery boy)"
                    value={newPrefKey}
                    onChange={(e) => setNewPrefKey(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                      isDark ? "bg-[#121319] border-[#2b2c36] text-white" : "bg-white border-[#cbd5e1]"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Preferred (e.g. delivery partner)"
                    value={newPrefVal}
                    onChange={(e) => setNewPrefVal(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                      isDark ? "bg-[#121319] border-[#2b2c36] text-white" : "bg-white border-[#cbd5e1]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPrefKey.trim() && newPrefVal.trim()) {
                        setExtractedRules((prev) => ({
                          ...prev,
                          preferredTerms: {
                            ...prev.preferredTerms,
                            [newPrefKey.trim()]: newPrefVal.trim(),
                          },
                        }));
                        setNewPrefKey("");
                        setNewPrefVal("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? "text-[#94a3b8] hover:text-white" : "text-[#64748b] hover:text-black"
                }`}
              >
                ← Back
              </button>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveRulesAndProceed("/guidelines")}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? "border-[#3b3c44] text-[#d2bbff] hover:bg-[#20212a]"
                      : "border-[#cbd5e1] text-[#7c3aed] hover:bg-[#f3f0ff]"
                  }`}
                >
                  Save & Open Brand Guidelines →
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveRulesAndProceed("/dashboard")}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#635BFF] to-[#7c3aed] text-white hover:opacity-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving Rules..." : "Finish Setup & Launch Workspace →"}
                </button>
              </div>
            </div>
          </div>
        )}

                </div>
        )}
      </main>
    </div>
  );
}
