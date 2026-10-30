"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { BrandProfile } from "@/lib/types";

export default function CreatorProfilePage() {
  const router = useRouter();
  const { user, setUser, brands, activeBrandId, setActiveBrandId, theme } = useApp();
  const isDark = theme === "dark";

  const [creatorType, setCreatorType] = useState<"IN_HOUSE_EMPLOYEE" | "AD_AGENCY" | "FREELANCE">(
    user?.creator_type || "IN_HOUSE_EMPLOYEE"
  );
  const [organizationName, setOrganizationName] = useState<string>(
    user?.organization_name || ""
  );
  const [specialization, setSpecialization] = useState<string>(
    user?.specialization || "Graphic & Visual Designer"
  );
  const [selectedBrandId, setSelectedBrandId] = useState<number>(
    user?.brand_id || activeBrandId || (brands[0]?.id ?? 1)
  );
  const [portfolioUrl, setPortfolioUrl] = useState<string>(
    (user?.onboarding_metadata?.portfolio_url as string) || ""
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync selectedBrandId when brands finish loading
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      const blinkit = brands.find((b) => b.name.toLowerCase() === "blinkit");
      setSelectedBrandId(blinkit?.id ?? brands[0].id);
    }
  }, [brands, selectedBrandId]);

  // Pre-fill from current user if returning
  useEffect(() => {
    if (user) {
      if (user.creator_type) setCreatorType(user.creator_type);
      if (user.organization_name) setOrganizationName(user.organization_name);
      if (user.specialization) setSpecialization(user.specialization);
      if (user.brand_id) setSelectedBrandId(user.brand_id);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!organizationName.trim()) {
      setErrorMessage(
        creatorType === "AD_AGENCY"
          ? "Please provide your Advertising Agency name."
          : creatorType === "IN_HOUSE_EMPLOYEE"
          ? "Please specify your Company Department or Marketing Team."
          : "Please specify your Studio or Practice name."
      );
      return;
    }

    if (!selectedBrandId) {
      setErrorMessage("Please select a target brand workspace from the dropdown.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedProfile = await api.updateCreatorProfile({
        creator_type: creatorType,
        organization_name: organizationName.trim(),
        specialization,
        brand_id: selectedBrandId,
        portfolio_url: portfolioUrl.trim() || undefined,
      });

      setUser(updatedProfile);
      setActiveBrandId(selectedBrandId);
      setSuccessMessage("Creator profile successfully saved! Launching Creative Studio...");

      setTimeout(() => {
        router.push("/content");
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save creator profile.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div
      className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${
        isDark ? "bg-[#101010] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {/* Toast Notification */}
      {(successMessage || errorMessage) && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md border-3 border-black p-4 shadow-[6px_6px_0px_#000] flex items-start gap-3 ${
            successMessage ? "bg-[var(--green)] text-black" : "bg-[var(--red)] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">
            {successMessage ? "check_circle" : "error"}
          </span>
          <div className="flex-1 font-mono text-xs font-bold leading-snug">
            {successMessage || errorMessage}
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="text-black font-black text-xs hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-3xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase">
            <span className="w-2.5 h-2.5 bg-[var(--yellow)] border border-black inline-block"></span>
            <span>INKLOOM AI // ONBOARDING GATEWAY</span>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-black bg-white dark:bg-[#1a1b20] text-black dark:text-white shadow-[1px_1px_0px_#000]">
            ROLE: CONTENT CREATOR
          </span>
        </div>

        {/* Title Banner */}
        <div
          className={`p-6 border-4 border-black shadow-[6px_6px_0px_#000] mb-6 ${
            isDark ? "bg-[#1c1d22]" : "bg-white"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-archivo font-black text-2xl sm:text-3xl uppercase tracking-tight text-[var(--ink)] dark:text-white">
                Creator Profile &amp; Governance Identity
              </h1>
              <p className="text-xs font-mono text-[#666] dark:text-[#888] mt-1 leading-relaxed">
                Configure your affiliation to calibrate AI governance guardrails, brand guidelines, and review audit trails.
              </p>
            </div>
            <div className="w-14 h-14 border-3 border-black bg-[var(--yellow)] text-black flex items-center justify-center shrink-0 shadow-[3px_3px_0px_#000]">
              <span className="material-symbols-outlined text-[32px]">badge</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Employment / Affiliation Model */}
          <div
            className={`p-5 sm:p-6 border-3 border-black shadow-[4px_4px_0px_#000] ${
              isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
              <label className="text-xs font-black uppercase text-[var(--ink)] dark:text-white font-mono flex items-center gap-2">
                <span className="w-5 h-5 border border-black bg-[var(--yellow)] text-black flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                SELECT PROFESSIONAL AFFILIATION
              </label>
              <span className="text-[10px] text-[#666] dark:text-[#888] font-bold">REQUIRED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: In-House Company Employee */}
              <div
                onClick={() => setCreatorType("IN_HOUSE_EMPLOYEE")}
                className={`p-4 border-3 border-black cursor-pointer transition-all shadow-[2px_2px_0px_#000] ${
                  creatorType === "IN_HOUSE_EMPLOYEE"
                    ? "bg-[var(--yellow)] text-black translate-x-0.5 translate-y-0.5 shadow-none"
                    : "bg-white dark:bg-[#1c1d22] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="w-8 h-8 border-2 border-black bg-white text-black flex items-center justify-center mb-2 shadow-[1px_1px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </div>
                <h4 className="font-archivo font-black text-xs uppercase leading-snug">
                  In-House Employee
                </h4>
                <p className="text-[10px] font-mono mt-1 opacity-80 leading-snug">
                  Internal brand marketer, growth specialist, or corporate team member.
                </p>
              </div>

              {/* Option 2: External Advertising Agency */}
              <div
                onClick={() => setCreatorType("AD_AGENCY")}
                className={`p-4 border-3 border-black cursor-pointer transition-all shadow-[2px_2px_0px_#000] ${
                  creatorType === "AD_AGENCY"
                    ? "bg-[var(--yellow)] text-black translate-x-0.5 translate-y-0.5 shadow-none"
                    : "bg-white dark:bg-[#1c1d22] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="w-8 h-8 border-2 border-black bg-white text-black flex items-center justify-center mb-2 shadow-[1px_1px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                </div>
                <h4 className="font-archivo font-black text-xs uppercase leading-snug">
                  Ad / Creative Agency
                </h4>
                <p className="text-[10px] font-mono mt-1 opacity-80 leading-snug">
                  Retained marketing agency, advertising firm, or external production house.
                </p>
              </div>

              {/* Option 3: Freelance Partner */}
              <div
                onClick={() => setCreatorType("FREELANCE")}
                className={`p-4 border-3 border-black cursor-pointer transition-all shadow-[2px_2px_0px_#000] ${
                  creatorType === "FREELANCE"
                    ? "bg-[var(--yellow)] text-black translate-x-0.5 translate-y-0.5 shadow-none"
                    : "bg-white dark:bg-[#1c1d22] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="w-8 h-8 border-2 border-black bg-white text-black flex items-center justify-center mb-2 shadow-[1px_1px_0px_#000]">
                  <span className="material-symbols-outlined text-[18px]">draw</span>
                </div>
                <h4 className="font-archivo font-black text-xs uppercase leading-snug">
                  Freelance Partner
                </h4>
                <p className="text-[10px] font-mono mt-1 opacity-80 leading-snug">
                  Independent designer, contracted copywriter, or creative collaborator.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Organization Name & Specialization */}
          <div
            className={`p-5 sm:p-6 border-3 border-black shadow-[4px_4px_0px_#000] space-y-4 ${
              isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <label className="text-xs font-black uppercase text-[var(--ink)] dark:text-white font-mono flex items-center gap-2">
                <span className="w-5 h-5 border border-black bg-[var(--yellow)] text-black flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                ORGANIZATION &amp; CREATIVE SPECIALIZATION
              </label>
              <span className="text-[10px] text-[#666] dark:text-[#888] font-bold">IDENTITY</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase mb-1.5 text-[var(--ink)] dark:text-white">
                  {creatorType === "AD_AGENCY"
                    ? "Advertising Agency Name"
                    : creatorType === "IN_HOUSE_EMPLOYEE"
                    ? "Company Department / Team"
                    : "Studio / Practice Name"}
                </label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={
                    creatorType === "AD_AGENCY"
                      ? "e.g. Ogilvy India, Dentsu Creative, Leo Burnett"
                      : creatorType === "IN_HOUSE_EMPLOYEE"
                      ? "e.g. Growth Marketing, Brand Studio, Social Media Team"
                      : "e.g. Independent Visual Studio"
                  }
                  className="w-full h-11 px-3.5 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase mb-1.5 text-[var(--ink)] dark:text-white">
                  Primary Creative Discipline
                </label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full h-11 px-3.5 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none cursor-pointer"
                >
                  <option value="Graphic & Visual Designer">Graphic &amp; Visual Designer</option>
                  <option value="Copywriter & Scriptwriter">Copywriter &amp; Scriptwriter</option>
                  <option value="Motion & Video Producer">Motion &amp; Video Producer</option>
                  <option value="Creative Director / Lead">Creative Director / Lead</option>
                  <option value="Social Media Content Creator">Social Media Content Creator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase mb-1.5 text-[var(--ink)] dark:text-white">
                Portfolio or Professional Reference (Optional)
              </label>
              <input
                type="text"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="e.g. https://behance.net/yourprofile or @handle"
                className="w-full h-10 px-3.5 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Brand Workspace Assignment (Dropdown as requested) */}
          <div
            className={`p-5 sm:p-6 border-3 border-black shadow-[4px_4px_0px_#000] ${
              isDark ? "bg-[#141518]" : "bg-[var(--paper)]"
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
              <label className="text-xs font-black uppercase text-[var(--ink)] dark:text-white font-mono flex items-center gap-2">
                <span className="w-5 h-5 border border-black bg-[var(--yellow)] text-black flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                ASSIGNED BRAND WORKSPACE
              </label>
              <span className="text-[10px] text-[#666] dark:text-[#888] font-bold">DROPDOWN SELECTION</span>
            </div>

            <p className="text-xs text-[#555] dark:text-[#a0a5b5] font-mono mb-3 leading-snug">
              Select the active brand workspace you will be creating and auditing creatives for:
            </p>

            <div className="relative">
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                className="w-full h-12 px-4 border-3 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-archivo font-black text-sm uppercase shadow-[3px_3px_0px_#000] focus:outline-none cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.industry || "Enterprise Brand"})
                  </option>
                ))}
              </select>
            </div>

            {selectedBrand && (
              <div className="mt-3 p-3 border-2 border-black bg-white dark:bg-[#1c1d22] flex items-center justify-between text-xs font-mono shadow-[2px_2px_0px_#000]">
                <div>
                  <span className="font-bold text-[var(--ink)] dark:text-white">{selectedBrand.name}</span>
                  <span className="text-[#666] dark:text-[#888] ml-2 font-normal">
                    {selectedBrand.tone_persona || "Active Brand Persona"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {(selectedBrand.approved_hex_palette || []).slice(0, 4).map((c, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 border border-black inline-block"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={() => router.push("/content")}
              className="px-4 py-2.5 border-2 border-black bg-white dark:bg-[#1c1d22] text-black dark:text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
            >
              Skip to Studio →
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 border-3 border-black bg-[var(--yellow)] hover:bg-[#ffcf00] text-black font-archivo font-black text-sm uppercase shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[20px] ${isSubmitting ? "animate-spin" : ""}`}>
                {isSubmitting ? "sync" : "verified"}
              </span>
              <span>{isSubmitting ? "Saving Profile..." : "Confirm & Launch Creative Studio →"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

