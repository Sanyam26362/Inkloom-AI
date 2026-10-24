"use client";

import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api";
import { Submission } from "@/lib/types";

type AssetKind = "IMAGE" | "AUDIO" | "VIDEO" | "TEXT";
type EventFit = "READY" | "REVIEW";

interface CanvasAsset {
  id: string;
  title: string;
  kind: AssetKind;
  description: string;
  eventFit: EventFit;
  copy: string;
  accent: string;
  festivalMark: string;
}

const canvasAssets: CanvasAsset[] = [
  {
    id: "diwali-safe-poster",
    title: "Diwali essentials poster",
    kind: "IMAGE",
    description: "Festive shopping visual with no crackers or fireworks.",
    eventFit: "READY",
    copy: "Diwali essentials\ndelivered fast",
    accent: "from-[#F8C200] via-[#ffd84d] to-[#fff4bd]",
    festivalMark: "🪔",
  },
  {
    id: "fireworks-poster",
    title: "Fireworks poster",
    kind: "IMAGE",
    description: "Intentionally unsafe example to demonstrate the event check.",
    eventFit: "REVIEW",
    copy: "Light up the sky\nthis Diwali",
    accent: "from-[#25252a] via-[#7f1d1d] to-[#ef4444]",
    festivalMark: "✦",
  },
  {
    id: "diwali-copy",
    title: "Diwali gift guide copy",
    kind: "TEXT",
    description: "A copy brief checked for Blinkit terminology and claims.",
    eventFit: "READY",
    copy: "Find festive favourites on the Blinkit app.",
    accent: "from-[#e8f6ff] to-[#ffffff]",
    festivalMark: "🪔",
  },
  {
    id: "festive-voiceover",
    title: "Festive voiceover",
    kind: "AUDIO",
    description: "Voiceover brief with a safe, warm Diwali tone.",
    eventFit: "READY",
    copy: "Shop Diwali essentials with Blinkit.",
    accent: "from-[#dff8eb] to-[#ffffff]",
    festivalMark: "✺",
  },
  {
    id: "diwali-reel",
    title: "Diwali essentials reel",
    kind: "VIDEO",
    description: "Short-form reel brief for the creator review lane.",
    eventFit: "READY",
    copy: "0:00  Sweets\n0:03  Decor\n0:08  Delivered",
    accent: "from-[#e9e1ff] to-[#ffffff]",
    festivalMark: "🪔",
  },
];

function fileKind(file: File): AssetKind | null {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("audio/")) return "AUDIO";
  if (file.type.startsWith("video/")) return "VIDEO";
  return null;
}

export default function ContentSetupPage() {
  const router = useRouter();
  const { activeBrand, activeBrandId, currentRole, brands, setActiveBrandId } = useApp();
  const [guidelineSource, setGuidelineSource] = useState<"PRESET" | "CUSTOM">("PRESET");
  const [guidelineFile, setGuidelineFile] = useState<File | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState(canvasAssets[0].id);
  const [guidelineCount, setGuidelineCount] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isUploadingGuidelines, setIsUploadingGuidelines] = useState(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedAsset = useMemo(
    () => canvasAssets.find((asset) => asset.id === selectedAssetId) ?? canvasAssets[0],
    [selectedAssetId]
  );

  const targetBrandId = activeBrandId || brands.find((b) => b.name.toLowerCase() === "blinkit")?.id || brands[0]?.id;

  useEffect(() => {
    if (!targetBrandId) return;
    if (!activeBrandId && targetBrandId) {
      setActiveBrandId(targetBrandId);
    }
    let cancelled = false;
    Promise.all([
      api.listGuidelines(targetBrandId, { userRole: currentRole }).catch(() => []),
      api.listSubmissions(targetBrandId, undefined, { userRole: currentRole }).catch(() => []),
    ]).then(([guidelines, currentSubmissions]) => {
      if (cancelled) return;
      setGuidelineCount(guidelines.length);
      setSubmissions(currentSubmissions);
    });
    return () => {
      cancelled = true;
    };
  }, [targetBrandId, activeBrandId, currentRole, setActiveBrandId]);

  const notify = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 5000);
  };

  const handleGuidelineUpload = async () => {
    const brandId = targetBrandId;
    if (!guidelineFile || !brandId) return;
    setIsUploadingGuidelines(true);
    try {
      const chunks = await api.uploadGuidelinePdf(brandId, guidelineFile, { userRole: currentRole });
      setGuidelineCount((count) => (count ?? 0) + chunks.length);
      notify("success", `${guidelineFile.name} indexed as Blinkit governance context.`);
    } catch (error) {
      notify("error", error instanceof ApiError ? error.message : "Guidelines could not be uploaded.");
    } finally {
      setIsUploadingGuidelines(false);
    }
  };

  const handleDesignUpload = async () => {
    const brandId = targetBrandId;
    if (!designFile || !brandId) return;
    setIsUploadingDesign(true);
    try {
      const chunks = await api.uploadGuidelinePdf(brandId, designFile, { userRole: currentRole });
      setGuidelineCount((count) => (count ?? 0) + chunks.length);
      notify("success", `${designFile.name} indexed as design reference for the prototype.`);
    } catch (error) {
      notify("error", error instanceof ApiError ? error.message : "The design reference could not be uploaded.");
    } finally {
      setIsUploadingDesign(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    setter(event.target.files?.[0] ?? null);
  };

  const createCreatorSubmission = async (asset: CanvasAsset, file?: File) => {
    setIsCreating(true);
    try {
      let brandId = targetBrandId;
      if (!brandId) {
        let blinkit = brands.find((b) => b.name.toLowerCase() === "blinkit");
        if (!blinkit) {
          blinkit = await api.createBrand({
            name: "Blinkit",
            industry: "Quick Commerce",
            tone_persona: "Energetic, fast, friendly, culturally connected, reliable",
            approved_hex_palette: ["#F8C200", "#00A36C", "#1C1C1E", "#FFFFFF"],
            banned_terms: ["10-minute guarantee", "instant delivery guaranteed", "cheapest prices"],
            preferred_terminology: { "delivery boy": "delivery partner" },
            min_wcag_contrast: 4.5,
          });
          await api.listBrands().then((all) => {
            if (all.length > 0) setActiveBrandId(all[0].id);
          });
        }
        brandId = blinkit.id;
        setActiveBrandId(blinkit.id);
      }

      const kind = file ? fileKind(file) : asset.kind;
      if (file && !kind) {
        notify("error", "Choose an image, audio, or video file.");
        return;
      }
      const submission = await api.createSubmission(
        {
          brand_id: brandId,
          title: file?.name ?? asset.title,
          content_format: kind ?? "TEXT",
          initial_content: file
            ? `Uploaded ${kind?.toLowerCase()} asset: ${file.name}`
            : `${asset.copy}\n\nDiwali event brief: ${asset.eventFit === "READY" ? "No crackers or fireworks in the visual." : "Review: this concept includes a fireworks/cracker direction."}`,
        },
        { userRole: currentRole }
      );

      if (file && kind) {
        if (kind === "IMAGE") await api.uploadImage(submission.id, file, { userRole: currentRole }, "diwali");
        if (kind === "AUDIO") await api.uploadAudio(submission.id, file, { userRole: currentRole }, "diwali");
        if (kind === "VIDEO") await api.uploadVideo(submission.id, file, { userRole: currentRole }, "diwali");
      }
      router.push(`/audit?id=${submission.id}&event=diwali`);
    } catch (error) {
      notify("error", error instanceof ApiError ? error.message : "The creator draft could not be created.");
    } finally {
      setIsCreating(false);
    }
  };

  const openExistingSubmission = (kind: AssetKind) => {
    const existing = submissions.find((submission) => submission.content_format === kind);
    if (existing) {
      router.push(`/audit?id=${existing.id}&event=diwali`);
      return;
    }
    createCreatorSubmission(selectedAsset);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] dark:bg-[#121316] text-[#111827] dark:text-[#e3e2e6] px-4 sm:px-6 lg:px-8 pb-12 transition-colors duration-200">
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md rounded-xl border p-4 shadow-xl transition-all ${
          message.type === "success"
            ? "border-[#00A36C]/40 bg-white dark:bg-[#1f1f23] text-[#111827] dark:text-white"
            : "border-[#dc2626]/40 bg-white dark:bg-[#1f1f23] text-[#111827] dark:text-white"
        }`}>
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined text-[20px] ${message.type === "success" ? "text-[#00A36C]" : "text-[#dc2626]"}`}>
              {message.type === "success" ? "check_circle" : "error"}
            </span>
            <p className="text-xs leading-5 font-medium">{message.text}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1500px] pt-6">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#64748b] dark:text-[#958da1]">
              <span>Brand onboarding</span>
              <span>→</span>
              <span className="font-bold text-[#005797] dark:text-[#d2bbff]">{activeBrand?.name ?? "Blinkit"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] dark:text-white">
              Set up the Blinkit Diwali campaign.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b5563] dark:text-[#ccc3d8]">
              Choose the client and event first. Judges can start with Inkloom&apos;s premade Blinkit pack or upload their own brand guidelines before testing a poster.
            </p>
          </div>
          <Link
            href="/audit?event=diwali"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#005797] hover:bg-[#004578] dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] px-4 text-sm font-semibold text-white shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit_square</span> Open creator workspace
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["01", "Brand onboarding", "Client, event & guidelines"],
            ["02", "Diwali canvas", "Pick a governed example"],
            ["03", "Creator review", "Find problems before publish"],
          ].map(([step, title, detail], index) => (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xs transition-all ${
                index === 0
                  ? "border-[#005797]/40 bg-[#ebf6ff] dark:border-[#7c3aed]/50 dark:bg-[#7c3aed]/15"
                  : "border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f]"
              }`}
            >
              <span className="font-mono text-xs font-bold text-[#005797] dark:text-[#d2bbff]">{step}</span>
              <div>
                <p className="text-sm font-semibold text-[#111827] dark:text-white">{title}</p>
                <p className="text-xs text-[#64748b] dark:text-[#958da1]">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
          <main className="space-y-6">
            <section className="rounded-2xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f] p-5 shadow-xs sm:p-6 transition-colors">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#005797] dark:text-[#d2bbff] font-bold">
                    01 / Governance inputs
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#111827] dark:text-white">Set the campaign context</h2>
                  <p className="mt-1 text-sm text-[#4b5563] dark:text-[#958da1]">These inputs define what the creator audit is checking.</p>
                </div>
                <span className="material-symbols-outlined rounded-lg bg-[#ebf6ff] dark:bg-[#7c3aed]/15 p-2 text-[#005797] dark:text-[#d2bbff]">
                  tune
                </span>
              </div>
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:text-[#958da1]">
                    Client brand
                  </span>
                  <select
                    value={activeBrandId || ""}
                    onChange={(event) => setActiveBrandId(Number(event.target.value))}
                    className="h-11 w-full rounded-lg border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] px-3 text-sm font-semibold text-[#111827] dark:text-white focus:border-[#005797] focus:outline-none transition-colors"
                  >
                    {brands.length === 0 ? (
                      <option value="">Loading brands…</option>
                    ) : (
                      brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:text-[#958da1]">
                    Upcoming event
                  </span>
                  <select className="h-11 w-full rounded-lg border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] px-3 text-sm font-semibold text-[#111827] dark:text-white focus:border-[#005797] focus:outline-none transition-colors">
                    <option>Diwali 2026</option>
                    <option disabled>Holi 2027 · coming soon</option>
                  </select>
                </label>
              </div>

              {/* Event Rules for Diwali 2026 Banner */}
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-[#F8C200]/40 dark:bg-[#2a2614] transition-colors">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600 dark:text-[#F8C200]">verified</span>
                      <p className="text-sm font-bold text-amber-950 dark:text-[#f8d84f]">Event rules for Diwali 2026</p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-[#e7d98b]">
                      Every sample poster in this prototype is a Diwali creative. The evaluation checks for festive context, Blinkit visual rules and the absence of cracker/firework imagery.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-900 border border-amber-200 dark:bg-black/30 dark:border-[#F8C200]/30 dark:text-[#f8d84f] font-semibold">
                    Brand-owned brief
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/90 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-black/30 dark:border-[#F8C200]/20 dark:text-[#e7d98b]">
                    ✓ Diwali must be visible
                  </span>
                  <span className="rounded-full bg-white/90 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-black/30 dark:border-[#F8C200]/20 dark:text-[#e7d98b]">
                    ✓ No crackers / fireworks
                  </span>
                  <span className="rounded-full bg-white/90 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-black/30 dark:border-[#F8C200]/20 dark:text-[#e7d98b]">
                    ✓ Verified claims only
                  </span>
                </div>
              </div>

              {/* Source Selector: Premade Pack vs Custom Upload */}
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setGuidelineSource("PRESET")}
                  className={`rounded-xl border p-4 text-left transition ${
                    guidelineSource === "PRESET"
                      ? "border-[#005797] bg-[#ebf6ff] dark:border-[#7c3aed] dark:bg-[#7c3aed]/15 shadow-xs"
                      : "border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] hover:border-[#005797]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#005797] dark:text-[#d2bbff]">auto_awesome</span>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300 font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#111827] dark:text-white">Use our premade Blinkit pack</p>
                  <p className="mt-1 text-xs leading-5 text-[#4b5563] dark:text-[#958da1]">
                    7 seeded Diwali rules are already indexed for the prototype. No judge setup required.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setGuidelineSource("CUSTOM")}
                  className={`rounded-xl border p-4 text-left transition ${
                    guidelineSource === "CUSTOM"
                      ? "border-[#005797] bg-[#ebf6ff] dark:border-[#7c3aed] dark:bg-[#7c3aed]/15 shadow-xs"
                      : "border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] hover:border-[#005797]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#005797] dark:text-[#d2bbff]">upload_file</span>
                    <span className="rounded-full bg-slate-100 dark:bg-[#292a2d] border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[10px] font-mono uppercase text-[#64748b] dark:text-[#9ca3af] font-bold">
                      Optional
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#111827] dark:text-white">Upload my own guidelines</p>
                  <p className="mt-1 text-xs leading-5 text-[#4b5563] dark:text-[#958da1]">
                    Use this for a different brand or to test a judge&apos;s own PDF.
                  </p>
                </button>
              </div>

              {/* 3 Upload Cards */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] p-4 transition-colors">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#005797] dark:text-[#d2bbff]">menu_book</span>
                    <span className="text-[10px] font-mono uppercase text-[#64748b] dark:text-[#958da1] font-semibold">
                      {guidelineSource === "PRESET" ? "Default" : "Custom"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">
                    {guidelineSource === "PRESET" ? "Premade guidelines" : "Custom guidelines"}
                  </p>
                  <p className="mt-1 min-h-10 text-xs text-[#4b5563] dark:text-[#958da1]">
                    {guidelineSource === "PRESET"
                      ? "Inkloom Blinkit Diwali pack is active with 7 seeded rules."
                      : guidelineCount === null
                      ? "Checking API…"
                      : `${guidelineCount} governance chunks indexed`}
                  </p>
                  <input
                    id="guideline-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      setGuidelineSource("CUSTOM");
                      handleFileChange(event, setGuidelineFile);
                    }}
                  />
                  <label
                    htmlFor="guideline-pdf"
                    className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#005797] dark:text-[#d2bbff] hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    {guidelineFile?.name ?? "Upload another PDF"}
                  </label>
                  {guidelineFile && (
                    <button
                      type="button"
                      onClick={handleGuidelineUpload}
                      disabled={isUploadingGuidelines}
                      className="mt-3 w-full rounded-lg bg-[#005797] hover:bg-[#004578] dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 transition-colors"
                    >
                      {isUploadingGuidelines ? "Indexing…" : "Index guidelines"}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] p-4 transition-colors">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#005797] dark:text-[#d2bbff]">design_services</span>
                    <span className="text-[10px] font-mono uppercase text-[#64748b] dark:text-[#958da1] font-semibold">
                      Reference
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">Design system PDF</p>
                  <p className="mt-1 min-h-10 text-xs text-[#4b5563] dark:text-[#958da1]">
                    Keep layouts, logo and color references beside the event.
                  </p>
                  <input
                    id="design-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => handleFileChange(event, setDesignFile)}
                  />
                  <label
                    htmlFor="design-pdf"
                    className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#005797] dark:text-[#d2bbff] hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    {designFile?.name ?? "Choose PDF"}
                  </label>
                  {designFile && (
                    <>
                      <button
                        type="button"
                        onClick={handleDesignUpload}
                        disabled={isUploadingDesign}
                        className="mt-3 w-full rounded-lg bg-[#005797] hover:bg-[#004578] dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 transition-colors"
                      >
                        {isUploadingDesign ? "Indexing…" : "Upload design reference"}
                      </button>
                      <p className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Ready for prototype governance
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] p-4 transition-colors">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#005797] dark:text-[#d2bbff]">folder_open</span>
                    <span className="text-[10px] font-mono uppercase text-[#64748b] dark:text-[#958da1] font-semibold">
                      Asset
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">Campaign asset</p>
                  <p className="mt-1 min-h-10 text-xs text-[#4b5563] dark:text-[#958da1]">
                    Upload image, audio or video to open a real creator audit.
                  </p>
                  <input
                    id="campaign-asset"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,audio/*,video/*"
                    className="hidden"
                    onChange={(event) => handleFileChange(event, setAssetFile)}
                  />
                  <label
                    htmlFor="campaign-asset"
                    className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#005797] dark:text-[#d2bbff] hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    {assetFile?.name ?? "Choose asset"}
                  </label>
                  {assetFile && (
                    <button
                      type="button"
                      onClick={() => createCreatorSubmission(selectedAsset, assetFile)}
                      disabled={isCreating}
                      className="mt-3 w-full rounded-lg bg-[#005797] hover:bg-[#004578] dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 transition-colors"
                    >
                      {isCreating ? "Opening creator…" : `Audit ${fileKind(assetFile) ?? "asset"}`}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f] p-5 shadow-xs sm:p-6 transition-colors">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#005797] dark:text-[#d2bbff] font-bold">
                    02 / Governed canvas
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#111827] dark:text-white">Pick a Blinkit Diwali starting point</h2>
                  <p className="mt-1 text-sm text-[#4b5563] dark:text-[#958da1]">
                    The right panel mirrors a test-sample gallery. It includes a safe poster and an intentional review case.
                  </p>
                </div>
                <span className="rounded-lg bg-amber-100 dark:bg-amber-950/50 p-2 text-amber-700 dark:text-[#F8C200]">
                  <span className="material-symbols-outlined">dashboard_customize</span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(270px,0.78fr)]">
                <label className="flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#005797]/30 dark:border-primary/40 bg-[#f8fafc] dark:bg-[#1f1f23] px-6 text-center transition hover:border-[#005797] hover:bg-[#ebf6ff]/30 dark:hover:bg-primary/10">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,audio/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setAssetFile(file);
                      if (file) notify("success", `${file.name} is ready. Audit it from the asset card.`);
                    }}
                  />
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#005797]/20 bg-[#ebf6ff] dark:bg-[#7c3aed]/15 text-[#005797] dark:text-[#d2bbff]">
                    <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                  </span>
                  <span className="text-base font-bold text-[#111827] dark:text-white">Drop a campaign asset here</span>
                  <span className="mt-2 max-w-sm text-sm text-[#4b5563] dark:text-[#958da1]">
                    or click to upload an image, audio or video for the Blinkit creator audit
                  </span>
                  <span className="mt-5 rounded-full bg-white dark:bg-[#292a2d] border border-[#cbd5e1] dark:border-[#3b3c44] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#64748b] dark:text-[#9ca3af]">
                    PNG · JPG · MP3 · MP4
                  </span>
                </label>

                <div className="rounded-2xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] p-4 transition-colors">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-white">
                      Try sample Diwali assets
                    </span>
                    <span className="rounded-md border border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#292a2d] px-2 py-0.5 font-mono text-[10px] text-[#64748b] dark:text-[#958da1]">
                      Dataset demo
                    </span>
                  </div>
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[#dc2626] font-bold">
                    Diwali poster samples
                  </p>
                  <div className="space-y-2.5">
                    {canvasAssets
                      .filter((asset) => asset.kind === "IMAGE")
                      .map((asset) => (
                        <button
                          type="button"
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`w-full rounded-xl border p-2 text-left transition ${
                            selectedAsset.id === asset.id
                              ? "border-[#005797] bg-[#ebf6ff] dark:border-[#7c3aed] dark:bg-[#7c3aed]/15 shadow-xs"
                              : "border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f] hover:border-[#005797]/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br ${asset.accent} text-[#1C1C1E] shadow-2xs`}>
                              <span className="text-xl leading-none">{asset.festivalMark}</span>
                              <span className="mt-0.5 text-[8px] font-black uppercase">Diwali</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-[#111827] dark:text-white">{asset.title}</p>
                              <p className="mt-0.5 truncate text-[11px] text-[#64748b] dark:text-[#958da1]">{asset.description}</p>
                            </div>
                            <span
                              className={`material-symbols-outlined text-[18px] ${
                                asset.eventFit === "READY" ? "text-[#00A36C]" : "text-[#dc2626]"
                              }`}
                            >
                              {asset.eventFit === "READY" ? "check_circle" : "warning"}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>

                  <p className="mb-2 mt-4 text-[10px] font-mono uppercase tracking-wider text-[#005797] dark:text-[#d2bbff] font-bold">
                    Other Diwali formats
                  </p>
                  <div className="space-y-2.5">
                    {canvasAssets
                      .filter((asset) => asset.kind !== "IMAGE")
                      .map((asset) => (
                        <button
                          type="button"
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`w-full rounded-xl border p-2 text-left transition ${
                            selectedAsset.id === asset.id
                              ? "border-[#005797] bg-[#ebf6ff] dark:border-[#7c3aed] dark:bg-[#7c3aed]/15 shadow-xs"
                              : "border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f] hover:border-[#005797]/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${asset.accent} text-[#1C1C1E] shadow-2xs`}>
                              <span className="text-xl leading-none">{asset.festivalMark}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-[#111827] dark:text-white">{asset.title}</p>
                              <p className="mt-0.5 truncate text-[11px] text-[#64748b] dark:text-[#958da1]">
                                {asset.kind} · {asset.description}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-[18px] text-[#00A36C]">check_circle</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] p-4 transition-colors">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined ${
                          selectedAsset.eventFit === "READY" ? "text-[#00A36C]" : "text-[#dc2626]"
                        }`}
                      >
                        {selectedAsset.eventFit === "READY" ? "verified" : "policy_alert"}
                      </span>
                      <p className="text-sm font-bold text-[#111827] dark:text-white">
                        {selectedAsset.eventFit === "READY"
                          ? "Diwali event fit: ready for review"
                          : "Diwali event fit: needs review"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#4b5563] dark:text-[#958da1]">
                      {selectedAsset.eventFit === "READY"
                        ? "No cracker/firework direction is present in this canvas brief."
                        : "This is deliberately unsafe: a fireworks/cracker direction must be flagged before approval."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => createCreatorSubmission(selectedAsset)}
                    disabled={isCreating}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#005797] hover:bg-[#004578] dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] px-4 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                    {isCreating ? "Opening…" : "Use in creator"}
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f] p-5 shadow-xs transition-colors">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#005797] dark:text-[#d2bbff] font-bold">
                03 / Creator lane
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#111827] dark:text-white">Problems are explained here</h2>
              <p className="mt-2 text-sm leading-6 text-[#4b5563] dark:text-[#958da1]">
                The creator chooses image, audio, text or video. Inkloom returns the finding, the governing rule and the safe correction.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  ["image", "Image", "palette + visual event rules"],
                  ["graphic_eq", "Audio", "transcript + voiceover rules"],
                  ["notes", "Text", "terms + verified claims"],
                  ["movie", "Video", "frames + spoken copy"],
                ].map(([icon, label, detail]) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-[#f8fafc] dark:bg-[#1f1f23] p-3 transition-colors"
                  >
                    <span className="material-symbols-outlined rounded-lg bg-[#ebf6ff] dark:bg-[#7c3aed]/15 p-2 text-[#005797] dark:text-[#d2bbff]">
                      {icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#111827] dark:text-white">{label}</p>
                      <p className="text-xs text-[#64748b] dark:text-[#958da1]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openExistingSubmission(selectedAsset.kind)}
                className="mt-5 w-full rounded-lg border border-[#005797]/40 bg-[#ebf6ff] dark:border-[#7c3aed]/40 dark:bg-[#7c3aed]/15 px-3 py-2.5 text-xs font-semibold text-[#005797] dark:text-[#d2bbff] hover:bg-[#005797]/15 dark:hover:bg-[#7c3aed]/25 transition-colors"
              >
                Open {selectedAsset.kind.toLowerCase()} creator lane
              </button>
            </section>

            <section className="rounded-2xl border border-amber-300 bg-amber-50/70 dark:border-[#F8C200]/40 dark:bg-[#2a2614] p-5 shadow-xs transition-colors">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 dark:text-[#F8C200]">lightbulb</span>
                <div>
                  <p className="text-sm font-bold text-amber-950 dark:text-[#f8d84f]">How the Diwali rule works</p>
                  <p className="mt-2 text-xs leading-5 text-amber-800 dark:text-[#e7d98b]">
                    A poster with no crackers or fireworks is event-safe. A poster that shows them is not automatically approved; it enters creator review with a visual finding.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#cbd5e1] dark:border-[#3b3c44] bg-white dark:bg-[#1b1b1f] p-5 shadow-xs transition-colors">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#111827] dark:text-white">Readiness</h2>
                <span className="font-mono text-xs text-[#00A36C] font-bold">LIVE</span>
              </div>
              <div className="space-y-3">
                {[
                  [Boolean(activeBrandId), "Blinkit profile connected"],
                  [guidelineCount !== null && guidelineCount > 0, "Governance context indexed"],
                  [Boolean(designFile), "Design reference staged"],
                  [Boolean(selectedAsset), "Canvas ready"],
                ].map(([ready, label]) => (
                  <div key={String(label)} className="flex items-center gap-2 text-xs">
                    <span
                      className={`material-symbols-outlined text-[17px] ${
                        ready ? "text-[#00A36C]" : "text-[#9ca3af]"
                      }`}
                    >
                      {ready ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span className={ready ? "text-[#111827] dark:text-white font-medium" : "text-[#64748b] dark:text-[#958da1]"}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
