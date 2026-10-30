"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { PackSummary, BrandProfile } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    setUser,
    brands,
    activeBrandId,
    setActiveBrandId,
    refreshBrands,
    refreshCampaigns,
    theme,
    toggleTheme,
    currentRole,
    setCurrentRole,
  } = useApp();

  useEffect(() => {
    if (currentRole !== "REVIEWER" && currentRole !== "MANAGER") {
      setCurrentRole("REVIEWER");
    }

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paramStep = urlParams.get("step");

      // Resume from URL or saved in-progress onboarding step
      if (paramStep) {
        const parsed = parseInt(paramStep, 10);
        if (parsed >= 1 && parsed <= 3) {
          setCurrentStep(parsed);
        }
      } else if (user?.onboarding_step) {
        setCurrentStep(user.onboarding_step);
      }

      // Restore saved draft metadata from server
      if (user?.onboarding_metadata) {
        const meta = user.onboarding_metadata;
        if (meta.clientType) setClientType(meta.clientType);
        if (meta.customBrandName) setCustomBrandName(meta.customBrandName);
        if (meta.customTone) setCustomTone(meta.customTone);
        if (meta.extractedRules) setExtractedRules(meta.extractedRules);
      }
    }
  }, [currentRole, setCurrentRole, user]);

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

  const handleSaveDraftAndExit = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updatedUser = await api.updateOnboardingState({
        onboarding_status: "IN_PROGRESS",
        onboarding_step: currentStep,
        brand_id: activeBrandId || undefined,
        onboarding_metadata: {
          clientType,
          customBrandName,
          customTone,
          extractedRules,
        },
      });
      setUser(updatedUser);
      setSuccessMessage(`Step ${currentStep} draft saved! You can resume from this step whenever you return.`);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch {
      setErrorMessage("Failed to save draft state to server.");
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
      // Mark onboarding completed in database
      await api.updateOnboardingState({
        onboarding_status: "COMPLETED",
        onboarding_step: 3,
        brand_id: brandId || undefined,
      }).then((u) => setUser(u)).catch(() => {});

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

  const steps = [
    { num: 1, label: "SELECT WORKSPACE", sub: "Brand Identity & Tenant" },
    { num: 2, label: "INGEST GUIDELINES", sub: "RAG pgvector Indexing" },
    { num: 3, label: "REVIEW RULESET", sub: "Deterministic Policies" },
  ];

  return (
    <div
      className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${
        isDark ? "bg-[#101010] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
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
            type="button"
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

      <div className="max-w-[1360px] mx-auto">
        {/* Top Header Bar */}
        <header
          className={`p-4 sm:p-5 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
          } flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black bg-[var(--yellow)] flex items-center justify-center font-archivo font-black text-black text-base shadow-[2px_2px_0px_#000]">
              IK
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 border border-black bg-[var(--yellow)] text-black text-[9px] font-black uppercase shadow-[1px_1px_0px_#000]">
                  SETUP WIZARD
                </span>
                <span className="text-[10px] font-black uppercase text-[#666] dark:text-[#888]">
                  ROLE: {currentRole}
                </span>
              </div>
              <h1 className="font-archivo font-black text-base sm:text-lg uppercase text-[var(--ink)] dark:text-white leading-tight">
                BrandLens Enterprise Onboarding
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 border-2 border-black bg-[var(--blue)] text-black font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              Skip to Dashboard →
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-black text-xs flex items-center justify-center shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>
          </div>
        </header>

        {/* Wizard Stepper Progress Bar */}
        <div
          className={`p-4 sm:p-5 border-4 ${
            isDark
              ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
              : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
          } mb-8`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map((s) => {
              const isActive = currentStep === s.num;
              const isCompleted = currentStep > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={!isCompleted}
                  onClick={() => isCompleted && setCurrentStep(s.num)}
                  className={`p-3 border-2 border-black text-left transition-all ${
                    isActive
                      ? "bg-[var(--yellow)] text-black shadow-[4px_4px_0px_#000] translate-x-0.5 translate-y-0.5"
                      : isCompleted
                      ? "bg-[var(--green)]/25 text-[var(--ink)] dark:text-white shadow-[2px_2px_0px_#000] cursor-pointer hover:bg-[var(--green)]/35"
                      : "bg-white/50 dark:bg-[#141518]/50 text-[#888] border-dashed cursor-not-allowed opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      STEP 0{s.num}
                    </span>
                    {isCompleted && (
                      <span className="px-1.5 py-0.2 border border-black bg-[var(--green)] text-black text-[9px] font-black uppercase">
                        ✓ DONE
                      </span>
                    )}
                    {isActive && (
                      <span className="px-1.5 py-0.2 border border-black bg-black text-[var(--yellow)] text-[9px] font-black uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="font-archivo font-black text-xs sm:text-sm uppercase tracking-tight truncate">
                    {s.label}
                  </div>
                  <div className="text-[10px] text-[#555] dark:text-[#999] truncate mt-0.5 font-mono">
                    {s.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1: SELECT CLIENT */}
        {currentStep === 1 && (
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <span className="px-3 py-1 border-2 border-black bg-[var(--pink)] text-black text-[10px] font-black uppercase shadow-[2px_2px_0px_#000]">
                STEP 01 OF 03 // CLIENT PROVISIONING
              </span>
              <h2 className="font-archivo font-black text-2xl sm:text-3xl uppercase tracking-tight text-[var(--ink)] dark:text-white mt-3 mb-2">
                Choose Enterprise Governance Workspace
              </h2>
              <p className="text-xs sm:text-sm font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed">
                Select the pre-configured quick-commerce benchmark client or initialize a custom brand workspace with dedicated guidelines and policy extraction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Option 1: Blinkit Quick-Commerce Demo */}
              <div
                onClick={() => setClientType("blinkit")}
                role="radio"
                aria-checked={clientType === "blinkit"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setClientType("blinkit");
                  }
                }}
                className={`p-6 border-4 border-black transition-all cursor-pointer flex flex-col justify-between ${
                  clientType === "blinkit"
                    ? "bg-[var(--yellow)]/20 shadow-[8px_8px_0px_#000] border-black"
                    : isDark
                    ? "bg-[#18191f] border-[#383a45] shadow-[4px_4px_0px_#000]"
                    : "bg-[var(--white)] shadow-[4px_4px_0px_#000]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border-2 border-black bg-[#F8C200] text-black font-archivo font-black text-2xl flex items-center justify-center shadow-[2px_2px_0px_#000]">
                        b
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-archivo font-black text-lg uppercase text-[var(--ink)] dark:text-white">
                            Blinkit
                          </h3>
                          <span className="px-2 py-0.5 border border-black bg-[var(--green)] text-black text-[9px] font-black uppercase shadow-[1px_1px_0px_#000]">
                            RECOMMENDED DEMO
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#666] dark:text-[#888] uppercase mt-0.5">
                          Quick Commerce Retail
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 border-2 border-black flex items-center justify-center ${
                        clientType === "blinkit" ? "bg-black" : "bg-white"
                      }`}
                    >
                      {clientType === "blinkit" && (
                        <span className="w-2.5 h-2.5 bg-[var(--yellow)]" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-mono text-[#444] dark:text-[#c0c5d5] leading-relaxed mb-4">
                    Pre-packaged with authentic Diwali 2026 campaign briefs, visual palette rules (#F8C200, #00A36C), banned terminology, and multi-modal compliance benchmarks.
                  </p>

                  <div className="p-3.5 border-2 border-black bg-white dark:bg-[#121316] space-y-2 mb-4 font-mono text-xs">
                    <div className="flex items-center gap-2 text-[var(--ink)] dark:text-[#b9f4a8]">
                      <span>✓</span>
                      <span>Authentic Diwali 2026 campaign briefs &amp; assets</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--ink)] dark:text-[#b9f4a8]">
                      <span>✓</span>
                      <span>Approved palette: Sunflower Yellow &amp; Forest Green</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--ink)] dark:text-[#b9f4a8]">
                      <span>✓</span>
                      <span>Zero-tolerance banned terminology preloaded</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--ink)] dark:text-[#b9f4a8]">
                      <span>✓</span>
                      <span>Multimodal test suite (posters, audio, video)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-black flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-black bg-[#F8C200]" title="#F8C200" />
                    <span className="w-4 h-4 border border-black bg-[#00A36C]" title="#00A36C" />
                    <span className="w-4 h-4 border border-black bg-[#1C1C1E]" title="#1C1C1E" />
                    <span className="text-[10px] text-[#666] dark:text-[#888] uppercase">Diwali 2026 Pack</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-[var(--green)]">
                    ⚡ 1-Click Ready
                  </span>
                </div>
              </div>

              {/* Option 2: Custom Brand Tenant */}
              <div
                onClick={() => setClientType("custom")}
                role="radio"
                aria-checked={clientType === "custom"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setClientType("custom");
                  }
                }}
                className={`p-6 border-4 border-black transition-all cursor-pointer flex flex-col justify-between ${
                  clientType === "custom"
                    ? "bg-[var(--pink)]/15 shadow-[8px_8px_0px_#000] border-black"
                    : isDark
                    ? "bg-[#18191f] border-[#383a45] shadow-[4px_4px_0px_#000]"
                    : "bg-[var(--white)] shadow-[4px_4px_0px_#000]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border-2 border-black bg-[var(--pink)] text-black font-archivo font-black text-2xl flex items-center justify-center shadow-[2px_2px_0px_#000]">
                        +
                      </div>
                      <div>
                        <h3 className="font-archivo font-black text-lg uppercase text-[var(--ink)] dark:text-white">
                          New Brand
                        </h3>
                        <p className="text-[11px] font-mono text-[#666] dark:text-[#888] uppercase mt-0.5">
                          Custom Enterprise Tenant
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 border-2 border-black flex items-center justify-center ${
                        clientType === "custom" ? "bg-black" : "bg-white"
                      }`}
                    >
                      {clientType === "custom" && (
                        <span className="w-2.5 h-2.5 bg-[var(--pink)]" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-mono text-[#444] dark:text-[#c0c5d5] leading-relaxed mb-4">
                    Configure a brand from scratch. Upload any PDF or markdown brand book and let our AI pipeline extract and index governance rules automatically.
                  </p>

                  {clientType === "custom" ? (
                    <div
                      className="space-y-3 mb-4 p-4 border-2 border-black bg-white dark:bg-[#121316]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[var(--ink)] dark:text-white mb-1">
                          Brand Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Health Corp"
                          value={customBrandName}
                          onChange={(e) => setCustomBrandName(e.target.value)}
                          className="w-full h-9 px-3 border-2 border-black font-mono text-xs font-bold text-black dark:text-white bg-white dark:bg-[#1a1b22] focus:outline-none shadow-[2px_2px_0px_#000]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[var(--ink)] dark:text-white mb-1">
                          Tone &amp; Persona
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Vibrant, youthful, reliable"
                          value={customTone}
                          onChange={(e) => setCustomTone(e.target.value)}
                          className="w-full h-9 px-3 border-2 border-black font-mono text-xs font-bold text-black dark:text-white bg-white dark:bg-[#1a1b22] focus:outline-none shadow-[2px_2px_0px_#000]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 border-2 border-black bg-white dark:bg-[#121316] space-y-2 mb-4 font-mono text-xs">
                      <div className="flex items-center gap-2 text-[var(--ink)] dark:text-white">
                        <span>✓</span>
                        <span>Upload proprietary brand guideline documents</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--ink)] dark:text-white">
                        <span>✓</span>
                        <span>Self-serve RAG pipeline with 768-dim embeddings</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--ink)] dark:text-white">
                        <span>✓</span>
                        <span>Customizable deterministic policy thresholds</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t-2 border-black flex items-center justify-between font-mono text-xs">
                  <span className="text-[10px] text-[#666] dark:text-[#888] uppercase">Custom Workspace</span>
                  <span className="text-[10px] font-black uppercase text-[var(--pink)]">
                    Self-Serve RAG
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-black">
              <span className="text-xs font-mono text-[#666] dark:text-[#888]">
                Selected: <strong className="text-[var(--ink)] dark:text-white uppercase">{clientType}</strong>
              </span>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveDraftAndExit}
                  className="w-full sm:w-auto px-5 py-3 border-2 border-black bg-amber-200 dark:bg-amber-900/40 text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Draft &amp; Exit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleStep1Submit}
                  className="w-full sm:w-auto px-8 py-3 border-3 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-archivo font-black text-sm uppercase shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Provisioning Brand..." : "Continue to Ingestion →"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: INGEST GUIDELINES */}
        {currentStep === 2 && (
          <section
            className={`p-6 sm:p-8 border-4 ${
              isDark
                ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
                : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            } max-w-5xl mx-auto`}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="px-3 py-1 border-2 border-black bg-[var(--blue)] text-black text-[10px] font-black uppercase shadow-[2px_2px_0px_#000]">
                STEP 02 OF 03 // GUIDELINES INGESTION
              </span>
              <h2 className="font-archivo font-black text-2xl uppercase tracking-tight text-[var(--ink)] dark:text-white mt-3 mb-2">
                Ingest Brand Guidelines
              </h2>
              <p className="text-xs sm:text-sm font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed">
                Load the pre-indexed Blinkit Diwali 2026 pack or upload custom PDFs for RAG semantic vector indexing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
              {/* Option A: 1-Click Premade Pack */}
              <div
                className={`p-6 border-3 border-black flex flex-col justify-between shadow-[4px_4px_0px_#000] ${
                  isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      <h3 className="font-archivo font-black text-base uppercase text-[var(--ink)] dark:text-white">
                        Blinkit Diwali 2026 Pack
                      </h3>
                    </div>
                    {packs.length > 0 && (
                      <span className="px-2 py-0.5 border border-black bg-[var(--yellow)] text-black text-[9px] font-black uppercase">
                        {packs[0].name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-4">
                    Indexes official brand visual guidelines, color palette specifications, font rules, tone parameters, and Diwali festive campaign brief into pgvector.
                  </p>
                  <div className="p-3 border-2 border-black bg-white dark:bg-[#1c1d22] text-xs font-mono space-y-1.5 mb-5 shadow-[2px_2px_0px_#000]">
                    <div className="text-[11px] text-[var(--ink)] dark:text-[#b9f4a8]">✓ blinkit_brand_guidelines.pdf</div>
                    <div className="text-[11px] text-[var(--ink)] dark:text-[#b9f4a8]">✓ blinkit_diwali_campaign_brief.md</div>
                    <div className="text-[11px] text-[var(--ink)] dark:text-[#b9f4a8]">✓ 12+ RAG guideline chunks with pgvector embeddings</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleLoadPremadePack}
                  className="w-full py-3 border-2 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-archivo font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  {loading ? "Indexing Pack..." : "🚀 Load Blinkit Pack (1-Click)"}
                </button>
              </div>

              {/* Option B: Upload Document */}
              <div
                className={`p-6 border-3 border-black flex flex-col justify-between shadow-[4px_4px_0px_#000] ${
                  isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📄</span>
                    <h3 className="font-archivo font-black text-base uppercase text-[var(--ink)] dark:text-white">
                      Upload Custom Guidelines
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed mb-4">
                    Upload a PDF or Markdown file. Our RAG engine extracts text, generates 768-dim embeddings, and automatically structures governance rules.
                  </p>

                  <label
                    className={`border-3 border-dashed border-black p-5 flex flex-col items-center justify-center cursor-pointer transition-all shadow-[2px_2px_0px_#000] ${
                      guidelineFile
                        ? "bg-[var(--pink)]/20"
                        : "bg-white dark:bg-[#1c1d22] hover:bg-black/5"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[32px] mb-1 text-black dark:text-white">
                      cloud_upload
                    </span>
                    <span className="text-xs font-mono font-black text-center uppercase truncate max-w-[220px]">
                      {guidelineFile ? guidelineFile.name : "Choose PDF or Markdown"}
                    </span>
                    <span className="text-[10px] font-mono text-[#666] dark:text-[#888] mt-0.5">
                      Up to 25MB (.pdf, .md, .txt)
                    </span>
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
                  className="w-full mt-4 py-3 border-2 border-black bg-[var(--pink)] hover:opacity-95 text-black font-archivo font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  {loading ? "Uploading & Indexing..." : "Upload & Extract Rules →"}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto pt-4 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto px-4 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                ← Back to Step 01
              </button>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveDraftAndExit}
                  className="w-full sm:w-auto px-4 py-2 border-2 border-black bg-amber-200 dark:bg-amber-900/40 text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Draft &amp; Exit
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-5 py-2 border-2 border-black bg-[var(--yellow)] text-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                >
                  Skip to RuleSet Review →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: REVIEW & EDIT RULESET */}
        {currentStep === 3 && (
          <section
            className={`p-6 sm:p-8 border-4 ${
              isDark
                ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]"
                : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"
            } max-w-5xl mx-auto`}
          >
            <div className="text-center max-w-xl mx-auto mb-6">
              <span className="px-3 py-1 border-2 border-black bg-[var(--green)] text-black text-[10px] font-black uppercase shadow-[2px_2px_0px_#000]">
                STEP 03 OF 03 // DETERMINISTIC RULESET
              </span>
              <h2 className="font-archivo font-black text-2xl uppercase tracking-tight text-[var(--ink)] dark:text-white mt-3 mb-2">
                Review Extracted RuleSet
              </h2>
              <p className="text-xs sm:text-sm font-mono text-[#555] dark:text-[#a0a5b5] leading-relaxed">
                Review and fine-tune the deterministic governance rules extracted from guidelines before activating audits.
              </p>
              {ingestionStats && (
                <div className="mt-3 inline-block px-3 py-1 border-2 border-black bg-[var(--green)] text-black text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000]">
                  ✓ Indexed {ingestionStats.chunksCreated} chunks from {ingestionStats.documentsIndexed} source documents
                </div>
              )}
            </div>

            <div className="space-y-6 max-w-4xl mx-auto mb-8 font-mono">
              {/* Approved Color Palette Swatches */}
              <div
                className={`p-5 border-3 border-black shadow-[4px_4px_0px_#000] ${
                  isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
                }`}
              >
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                  <h4 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                    Approved Color Palette (Hex)
                  </h4>
                  <span className="text-[10px] text-[#666] dark:text-[#888] font-bold">
                    {extractedRules.palette.length} SWATCHES
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 mb-3">
                  {extractedRules.palette.map((color, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white dark:bg-[#1c1d22] text-xs font-mono font-bold shadow-[2px_2px_0px_#000]"
                    >
                      <span
                        className="w-4 h-4 border border-black inline-block shrink-0 shadow-[1px_1px_0px_#000]"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-black dark:text-white">{color}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExtractedRules((prev) => ({
                            ...prev,
                            palette: prev.palette.filter((_, i) => i !== idx),
                          }))
                        }
                        className="w-5 h-5 border border-black bg-[var(--red)] text-white font-black text-xs flex items-center justify-center hover:opacity-80 cursor-pointer ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="#HEX (e.g. #FFDB1F)"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-40 h-9 px-3 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
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
                    className="h-9 px-4 border-2 border-black bg-[var(--yellow)] text-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                  >
                    + Add Hex
                  </button>
                </div>
              </div>

              {/* Banned Terms */}
              <div
                className={`p-5 border-3 border-black shadow-[4px_4px_0px_#000] ${
                  isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
                }`}
              >
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                  <h4 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                    Banned Terminology (Zero Tolerance)
                  </h4>
                  <span className="text-[10px] text-[#666] dark:text-[#888] font-bold">
                    {extractedRules.bannedTerms.length} BANNED PHRASES
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {extractedRules.bannedTerms.map((term, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-2.5 py-1 border-2 border-black bg-[var(--red)] text-white text-xs font-mono font-bold shadow-[2px_2px_0px_#000]"
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
                        className="w-4 h-4 border border-black bg-white text-black font-black text-[10px] flex items-center justify-center hover:opacity-80 cursor-pointer"
                      >
                        ✕
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
                    className="flex-1 h-9 px-3 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
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
                    className="h-9 px-4 border-2 border-black bg-[var(--red)] text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                  >
                    + Add Term
                  </button>
                </div>
              </div>

              {/* Preferred Terminology */}
              <div
                className={`p-5 border-3 border-black shadow-[4px_4px_0px_#000] ${
                  isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
                }`}
              >
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                  <h4 className="font-archivo font-black text-xs uppercase text-[var(--ink)] dark:text-white">
                    Preferred Terminology Replacements
                  </h4>
                  <span className="text-[10px] text-[#666] dark:text-[#888] font-bold">
                    {Object.keys(extractedRules.preferredTerms).length} REPLACEMENTS
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {Object.entries(extractedRules.preferredTerms).map(([bad, good], idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-xs font-mono shadow-[2px_2px_0px_#000]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="line-through text-[var(--red)] font-bold">{bad}</span>
                        <span className="text-[#666] font-black">→</span>
                        <span className="font-bold text-[var(--ink)] dark:text-[#b9f4a8]">{good}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...extractedRules.preferredTerms };
                          delete updated[bad];
                          setExtractedRules((prev) => ({ ...prev, preferredTerms: updated }));
                        }}
                        className="w-5 h-5 border border-black bg-[var(--red)] text-white font-black text-xs flex items-center justify-center hover:opacity-80 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    placeholder="Deprecated (e.g. delivery boy)"
                    value={newPrefKey}
                    onChange={(e) => setNewPrefKey(e.target.value)}
                    className="h-9 px-3 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Preferred (e.g. delivery partner)"
                    value={newPrefVal}
                    onChange={(e) => setNewPrefVal(e.target.value)}
                    className="h-9 px-3 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
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
                    className="h-9 px-4 border-2 border-black bg-[var(--yellow)] text-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                  >
                    + Add Pair
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto pt-4 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto px-4 py-2 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                ← Back to Ingestion
              </button>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveDraftAndExit}
                  className="w-full sm:w-auto px-4 py-2.5 border-2 border-black bg-amber-200 dark:bg-amber-900/40 text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Draft &amp; Exit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveRulesAndProceed("/guidelines")}
                  className="w-full sm:w-auto px-4 py-2.5 border-2 border-black bg-[var(--blue)] hover:bg-[#8cc7ff] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  Save &amp; Open Guidelines →
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveRulesAndProceed("/dashboard")}
                  className="w-full sm:w-auto px-6 py-2.5 border-3 border-black bg-[var(--green)] hover:bg-[#a6ec93] text-black font-archivo font-black text-xs sm:text-sm uppercase shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving Rules..." : "Finish Setup & Launch Workspace →"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
