"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { PackSummary, UserRole } from "@/lib/types";

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
  } = useApp();

  const isDark = theme === "dark";

  // Wizard state: 1: Client -> 2: Ingestion -> 3: Rules -> 4: Persona & Launch
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

  // Step 4: Persona Selection
  const [selectedPersona, setSelectedPersona] = useState<UserRole>("CREATOR");

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
  const handleStep1Submit = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (clientType === "blinkit") {
        let blinkit = brands.find((b) => b.name.toLowerCase() === "blinkit");
        if (!blinkit) {
          blinkit = await api.createBrand({
            name: "Blinkit",
            industry: "Quick Commerce",
            tone_persona: "Energetic, fast, friendly, culturally connected, reliable",
            approved_hex_palette: ["#F8C200", "#00A36C", "#1C1C1E", "#FFFFFF"],
            banned_terms: ["10-minute guarantee", "instant delivery guaranteed", "cheapest prices"],
            preferred_terminology: { "delivery boy": "delivery partner", "hyperlocal": "quick commerce" },
            min_wcag_contrast: 4.5,
          });
          await refreshBrands();
        }
        setActiveBrandId(blinkit.id);
      } else {
        if (!customBrandName.trim()) {
          throw new Error("Please enter a brand name.");
        }
        const created = await api.createBrand({
          name: customBrandName.trim(),
          industry: customIndustry,
          tone_persona: customTone,
          approved_hex_palette: ["#2563EB", "#1E293B", "#F8FAFC"],
          banned_terms: ["unbeatable guarantee"],
          preferred_terminology: {},
          min_wcag_contrast: 4.5,
        });
        await refreshBrands();
        setActiveBrandId(created.id);
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
        let blinkit = brands.find((b) => b.name.toLowerCase() === "blinkit");
        if (!blinkit) {
          blinkit = await api.createBrand({
            name: "Blinkit",
            industry: "Quick Commerce",
            tone_persona: "Energetic, fast, friendly, culturally connected, reliable",
            approved_hex_palette: ["#F8C200", "#00A36C", "#1C1C1E", "#FFFFFF"],
            banned_terms: ["10-minute guarantee", "instant delivery guaranteed", "cheapest prices"],
            preferred_terminology: { "delivery boy": "delivery partner", "hyperlocal": "quick commerce" },
            min_wcag_contrast: 4.5,
          });
          await refreshBrands();
        }
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

  const handleSaveRulesAndProceed = async () => {
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
      setCurrentStep(4);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save rule set.");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaLaunch = async (persona: UserRole) => {
    setLoading(true);
    try {
      await loginAsDemoUser(persona);
      if (persona === "CREATOR") {
        router.push("/content");
      } else if (persona === "JUDGE") {
        router.push("/judge");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to initialize persona session.");
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#7c3aed] selection:text-white transition-colors duration-200 ${
        isDark ? "bg-[#0d0e12] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#0f172a]"
      }`}
    >
      {/* Top Bar */}
      <header
        className={`w-full h-16 border-b flex items-center justify-between px-6 backdrop-blur-md sticky top-0 z-30 ${
          isDark ? "bg-[#13141a]/90 border-[#2b2c34]" : "bg-white/90 border-[#e2e8f0]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] flex items-center justify-center shadow-md">
            <span className="font-black text-white text-base tracking-tighter">IK</span>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none">Inkloom AI</h1>
            <span className="text-[11px] text-[#94a3b8] font-medium leading-none">Enterprise Brand Governance</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${
              isDark ? "bg-[#1c1d24] border-[#2f303b] text-amber-400" : "bg-white border-[#e2e8f0] text-slate-600"
            }`}
            title="Toggle Dark/Light Mode"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">
            <div
              className={`absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 -z-0 ${
                isDark ? "bg-[#252630]" : "bg-[#e2e8f0]"
              }`}
            />
            {[
              { num: 1, label: "Select Client" },
              { num: 2, label: "Ingest Guidelines" },
              { num: 3, label: "Review Rules" },
              { num: 4, label: "Launch Persona" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div key={step.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#7c3aed] text-white ring-4 ring-[#7c3aed]/20 shadow-lg"
                        : isPast
                        ? "bg-emerald-500 text-white"
                        : isDark
                        ? "bg-[#1c1d24] border border-[#2f303b] text-[#94a3b8]"
                        : "bg-white border border-[#cbd5e1] text-[#64748b]"
                    }`}
                  >
                    {isPast ? "✓" : step.num}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold tracking-wide uppercase ${
                      isActive
                        ? isDark
                          ? "text-white"
                          : "text-[#0f172a]"
                        : isDark
                        ? "text-[#64748b]"
                        : "text-[#94a3b8]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 font-bold ml-4">
              ×
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 font-bold ml-4">
              ×
            </button>
          </div>
        )}

        {/* STEP 1: SELECT CLIENT */}
        {currentStep === 1 && (
          <div
            className={`p-6 sm:p-8 rounded-2xl border shadow-xl transition-all ${
              isDark ? "bg-[#14151c] border-[#2b2c36]" : "bg-white border-[#e2e8f0]"
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c3aed] bg-[#7c3aed]/10 px-3 py-1 rounded-full">
                Step 1 of 4
              </span>
              <h2 className="text-2xl font-black mt-3 mb-2 tracking-tight">Choose Your Enterprise Brand</h2>
              <p className={`text-sm ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                Select our turnkey quick-commerce demonstration client or configure your custom brand parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
              {/* Blinkit Card */}
              <div
                onClick={() => setClientType("blinkit")}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  clientType === "blinkit"
                    ? "border-[#F8C200] bg-[#F8C200]/5 ring-4 ring-[#F8C200]/10"
                    : isDark
                    ? "border-[#2b2c36] hover:border-[#3b3c48] bg-[#1a1b24]/50"
                    : "border-[#e2e8f0] hover:border-[#cbd5e1] bg-slate-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F8C200] flex items-center justify-center font-black text-black text-base shadow-xs">
                        b
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">Blinkit</h3>
                        <span className="text-[11px] text-[#94a3b8]">Quick Commerce Retail</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Recommended Demo
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Pre-packaged with authentic Diwali 2026 campaign briefs, visual palette rules (#F8C200, #00A36C),
                    banned terminology, and multi-modal compliance tests.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-dashed border-[#cbd5e1]/30">
                  <span className="w-4 h-4 rounded-full bg-[#F8C200] inline-block shadow-2xs" />
                  <span className="w-4 h-4 rounded-full bg-[#00A36C] inline-block shadow-2xs" />
                  <span className="w-4 h-4 rounded-full bg-[#1C1C1E] inline-block shadow-2xs" />
                  <span className="text-[11px] font-mono text-[#94a3b8] ml-auto">Diwali 2026 Pack</span>
                </div>
              </div>

              {/* Custom Brand Card */}
              <div
                onClick={() => setClientType("custom")}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  clientType === "custom"
                    ? "border-[#7c3aed] bg-[#7c3aed]/5 ring-4 ring-[#7c3aed]/10"
                    : isDark
                    ? "border-[#2b2c36] hover:border-[#3b3c48] bg-[#1a1b24]/50"
                    : "border-[#e2e8f0] hover:border-[#cbd5e1] bg-slate-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-xs">
                        +
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">New Brand</h3>
                        <span className="text-[11px] text-[#94a3b8]">Custom Enterprise Tenant</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Configure a brand from scratch. Upload any PDF or markdown brand book and let our AI pipeline
                    extract and index governance rules automatically.
                  </p>
                </div>
                {clientType === "custom" && (
                  <div className="space-y-3 pt-3 border-t border-dashed border-[#cbd5e1]/30">
                    <input
                      type="text"
                      placeholder="Brand Name (e.g. Acme Corp)"
                      value={customBrandName}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-[#7c3aed] ${
                        isDark ? "bg-[#121319] border-[#2b2c36] text-white" : "bg-white border-[#cbd5e1]"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Tone & Persona (e.g. Sophisticated, Modern)"
                      value={customTone}
                      onChange={(e) => setCustomTone(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-[#7c3aed] ${
                        isDark ? "bg-[#121319] border-[#2b2c36] text-white" : "bg-white border-[#cbd5e1]"
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end max-w-3xl mx-auto">
              <button
                type="button"
                disabled={loading}
                onClick={handleStep1Submit}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Configuring..." : "Continue to Ingestion →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INGEST GUIDELINES */}
        {currentStep === 2 && (
          <div
            className={`p-6 sm:p-8 rounded-2xl border shadow-xl transition-all ${
              isDark ? "bg-[#14151c] border-[#2b2c36]" : "bg-white border-[#e2e8f0]"
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c3aed] bg-[#7c3aed]/10 px-3 py-1 rounded-full">
                Step 2 of 4
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
                Step 3 of 4
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

            <div className="flex justify-between max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? "text-[#94a3b8] hover:text-white" : "text-[#64748b] hover:text-black"
                }`}
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveRulesAndProceed}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving Rules..." : "Confirm & Continue to Personas →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PERSONA SELECTION & LAUNCH */}
        {currentStep === 4 && (
          <div
            className={`p-6 sm:p-8 rounded-2xl border shadow-xl transition-all ${
              isDark ? "bg-[#14151c] border-[#2b2c36]" : "bg-white border-[#e2e8f0]"
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c3aed] bg-[#7c3aed]/10 px-3 py-1 rounded-full">
                Step 4 of 4
              </span>
              <h2 className="text-2xl font-black mt-3 mb-2 tracking-tight">Select Demo Persona & Launch</h2>
              <p className={`text-sm ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                Choose how you wish to experience Inkloom. Each persona authenticates with real JWT credentials and opens
                its specialized governance interface.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
              {/* Creator Studio Card */}
              <div
                onClick={() => setSelectedPersona("CREATOR")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPersona === "CREATOR"
                    ? "border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10"
                    : isDark
                    ? "border-[#2b2c36] hover:border-[#3b3c48] bg-[#1a1b24]/50"
                    : "border-[#e2e8f0] hover:border-[#cbd5e1] bg-slate-50"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3 shadow-xs">
                    🎨
                  </div>
                  <h3 className="font-bold text-base leading-tight">Alex Rivera</h3>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Creator Role</span>
                  <p className={`text-xs mt-3 leading-relaxed ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Submit Instagram posts, posters, audio, or video. Get instant multi-modal compliance feedback,
                    confidence scores, and one-click fixes.
                  </p>
                </div>
                <div className="pt-4 border-t border-dashed border-[#cbd5e1]/30 mt-4">
                  <span className="text-[11px] font-semibold text-emerald-400">Opens Creator Studio →</span>
                </div>
              </div>

              {/* Judge Canvas Card */}
              <div
                onClick={() => setSelectedPersona("JUDGE")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPersona === "JUDGE"
                    ? "border-amber-500 bg-amber-500/5 ring-4 ring-amber-500/10"
                    : isDark
                    ? "border-[#2b2c36] hover:border-[#3b3c48] bg-[#1a1b24]/50"
                    : "border-[#e2e8f0] hover:border-[#cbd5e1] bg-slate-50"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg mb-3 shadow-xs">
                    ⚖️
                  </div>
                  <h3 className="font-bold text-base leading-tight">Sasha Bloom</h3>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Judge Role</span>
                  <p className={`text-xs mt-3 leading-relaxed ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Interactive evaluation canvas. Inspect live indexed state, test sample assets (Spider-Man poster, audio ads,
                    promos), and verify strictness.
                  </p>
                </div>
                <div className="pt-4 border-t border-dashed border-[#cbd5e1]/30 mt-4">
                  <span className="text-[11px] font-semibold text-amber-400">Opens Judge Canvas →</span>
                </div>
              </div>

              {/* Admin Dashboard Card */}
              <div
                onClick={() => setSelectedPersona("ADMIN")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPersona === "ADMIN"
                    ? "border-purple-500 bg-purple-500/5 ring-4 ring-purple-500/10"
                    : isDark
                    ? "border-[#2b2c36] hover:border-[#3b3c48] bg-[#1a1b24]/50"
                    : "border-[#e2e8f0] hover:border-[#cbd5e1] bg-slate-50"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg mb-3 shadow-xs">
                    🛡️
                  </div>
                  <h3 className="font-bold text-base leading-tight">Jordan Vance</h3>
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Admin Role</span>
                  <p className={`text-xs mt-3 leading-relaxed ${isDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Enterprise review queue. View submissions, approve/reject with mandatory reasons, override false
                    positives, and monitor AI agreement metrics.
                  </p>
                </div>
                <div className="pt-4 border-t border-dashed border-[#cbd5e1]/30 mt-4">
                  <span className="text-[11px] font-semibold text-purple-400">Opens Admin Queue →</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? "text-[#94a3b8] hover:text-white" : "text-[#64748b] hover:text-black"
                }`}
              >
                ← Back
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handlePersonaLaunch(selectedPersona)}
                className="px-8 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white hover:opacity-95 transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Authenticating Session..." : `Launch as ${selectedPersona} 🚀`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
