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

  useEffect(() => {
    if (!activeBrandId) return;
    let cancelled = false;
    Promise.all([
      api.listGuidelines(activeBrandId, { userRole: currentRole }).catch(() => []),
      api.listSubmissions(activeBrandId, undefined, { userRole: currentRole }).catch(() => []),
    ]).then(([guidelines, currentSubmissions]) => {
      if (cancelled) return;
      setGuidelineCount(guidelines.length);
      setSubmissions(currentSubmissions);
    });
    return () => {
      cancelled = true;
    };
  }, [activeBrandId, currentRole]);

  const notify = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 5000);
  };

  const handleGuidelineUpload = async () => {
    if (!guidelineFile || !activeBrandId) return;
    setIsUploadingGuidelines(true);
    try {
      const chunks = await api.uploadGuidelinePdf(activeBrandId, guidelineFile, { userRole: currentRole });
      setGuidelineCount((count) => (count ?? 0) + chunks.length);
      notify("success", `${guidelineFile.name} indexed as Blinkit governance context.`);
    } catch (error) {
      notify("error", error instanceof ApiError ? error.message : "Guidelines could not be uploaded.");
    } finally {
      setIsUploadingGuidelines(false);
    }
  };

  const handleDesignUpload = async () => {
    if (!designFile || !activeBrandId) return;
    setIsUploadingDesign(true);
    try {
      const chunks = await api.uploadGuidelinePdf(activeBrandId, designFile, { userRole: currentRole });
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
    if (!activeBrandId) {
      notify("error", "Blinkit is still loading. Start the backend and retry.");
      return;
    }
    setIsCreating(true);
    try {
      const kind = file ? fileKind(file) : asset.kind;
      if (file && !kind) {
        notify("error", "Choose an image, audio, or video file.");
        return;
      }
      const submission = await api.createSubmission(
        {
          brand_id: activeBrandId,
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
    <div className="min-h-[calc(100vh-4rem)] bg-surface text-on-surface px-gutter-desktop pb-12">
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md rounded-xl border p-4 shadow-2xl ${message.type === "success" ? "border-tertiary/40 bg-surface-container-high" : "border-error/40 bg-surface-container-high"}`}>
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined ${message.type === "success" ? "text-tertiary" : "text-error"}`}>{message.type === "success" ? "check_circle" : "error"}</span>
            <p className="text-sm leading-5">{message.text}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1500px] pt-6">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-outline">
              <span>Brand onboarding</span><span>→</span><span className="text-primary">{activeBrand?.name ?? "Blinkit"}</span>
            </div>
            <h1 className="font-headline-lg text-3xl font-bold tracking-tight sm:text-4xl">Set up the Blinkit Diwali campaign.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">Choose the client and event first. Judges can start with Inkloom&apos;s premade Blinkit pack or upload their own brand guidelines before testing a poster.</p>
          </div>
          <Link href="/audit?event=diwali" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-sm font-semibold text-on-primary-container shadow-sm transition hover:opacity-90">
            <span className="material-symbols-outlined text-[18px]">edit_square</span> Open creator workspace
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[["01", "Brand onboarding", "Client, event & guidelines"], ["02", "Diwali canvas", "Pick a governed example"], ["03", "Creator review", "Find problems before publish"]].map(([step, title, detail], index) => (
            <div key={step} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${index === 0 ? "border-primary/40 bg-primary-container/10" : "border-outline-variant/30 bg-surface-container-low"}`}>
              <span className="font-mono text-xs font-bold text-primary">{step}</span>
              <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-outline">{detail}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
          <main className="space-y-6">
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">01 / Governance inputs</p><h2 className="mt-1 text-xl font-bold">Set the campaign context</h2><p className="mt-1 text-sm text-on-surface-variant">These inputs define what the creator audit is checking.</p></div>
                <span className="material-symbols-outlined rounded-lg bg-primary-container/15 p-2 text-primary">tune</span>
              </div>
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-outline">Client brand</span><select value={activeBrandId || ""} onChange={(event) => setActiveBrandId(Number(event.target.value))} className="h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container px-3 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none">{brands.length === 0 ? <option value="">Loading brands…</option> : brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-outline">Upcoming event</span><select className="h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container px-3 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none"><option>Diwali 2026</option><option disabled>Holi 2027 · coming soon</option></select></label>
              </div>
              <div className="mb-5 rounded-xl border border-[#F8C200]/45 bg-[#fff9dc] p-4 dark:bg-[#2a2614]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#8a6800]">verified</span><p className="text-sm font-bold text-[#5b4700] dark:text-[#f8d84f]">Event rules for Diwali 2026</p></div><p className="mt-1 text-xs leading-5 text-[#6e5b16] dark:text-[#e7d98b]">Every sample poster in this prototype is a Diwali creative. The evaluation checks for festive context, Blinkit visual rules and the absence of cracker/firework imagery.</p></div><span className="shrink-0 rounded-full bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#6e5b16] dark:bg-black/10 dark:text-[#f8d84f]">Brand-owned brief</span></div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-[#6e5b16] dark:bg-black/10 dark:text-[#e7d98b]">✓ Diwali must be visible</span><span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-[#6e5b16] dark:bg-black/10 dark:text-[#e7d98b]">✓ No crackers / fireworks</span><span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-[#6e5b16] dark:bg-black/10 dark:text-[#e7d98b]">✓ Verified claims only</span></div></div>
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button type="button" onClick={() => setGuidelineSource("PRESET")} className={`rounded-xl border p-4 text-left transition ${guidelineSource === "PRESET" ? "border-primary bg-primary-container/10" : "border-outline-variant/30 bg-surface-container hover:border-primary/50"}`}><div className="flex items-center justify-between"><span className="material-symbols-outlined text-primary">auto_awesome</span><span className="rounded-full bg-tertiary-container/30 px-2 py-1 text-[10px] font-mono uppercase text-tertiary">Recommended</span></div><p className="mt-3 text-sm font-bold">Use our premade Blinkit pack</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">7 seeded Diwali rules are already indexed for the prototype. No judge setup required.</p></button>
                <button type="button" onClick={() => setGuidelineSource("CUSTOM")} className={`rounded-xl border p-4 text-left transition ${guidelineSource === "CUSTOM" ? "border-primary bg-primary-container/10" : "border-outline-variant/30 bg-surface-container hover:border-primary/50"}`}><div className="flex items-center justify-between"><span className="material-symbols-outlined text-primary">upload_file</span><span className="rounded-full bg-surface-container-high px-2 py-1 text-[10px] font-mono uppercase text-outline">Optional</span></div><p className="mt-3 text-sm font-bold">Upload my own guidelines</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">Use this for a different brand or to test a judge&apos;s own PDF.</p></button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4"><div className="mb-3 flex items-center justify-between"><span className="material-symbols-outlined text-primary">menu_book</span><span className="text-[10px] font-mono uppercase text-outline">{guidelineSource === "PRESET" ? "Default" : "Custom"}</span></div><p className="text-sm font-semibold">{guidelineSource === "PRESET" ? "Premade guidelines" : "Custom guidelines"}</p><p className="mt-1 min-h-10 text-xs text-on-surface-variant">{guidelineSource === "PRESET" ? "Inkloom Blinkit Diwali pack is active with 7 seeded rules." : guidelineCount === null ? "Checking API…" : `${guidelineCount} governance chunks indexed`}</p><input id="guideline-pdf" type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => { setGuidelineSource("CUSTOM"); handleFileChange(event, setGuidelineFile); }} /><label htmlFor="guideline-pdf" className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary hover:underline"><span className="material-symbols-outlined text-[16px]">upload_file</span>{guidelineFile?.name ?? "Upload another PDF"}</label>{guidelineFile && <button type="button" onClick={handleGuidelineUpload} disabled={isUploadingGuidelines} className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isUploadingGuidelines ? "Indexing…" : "Index guidelines"}</button>}</div>
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4"><div className="mb-3 flex items-center justify-between"><span className="material-symbols-outlined text-primary">design_services</span><span className="text-[10px] font-mono uppercase text-outline">Reference</span></div><p className="text-sm font-semibold">Design system PDF</p><p className="mt-1 min-h-10 text-xs text-on-surface-variant">Keep layouts, logo and color references beside the event.</p><input id="design-pdf" type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => handleFileChange(event, setDesignFile)} /><label htmlFor="design-pdf" className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary hover:underline"><span className="material-symbols-outlined text-[16px]">upload_file</span>{designFile?.name ?? "Choose PDF"}</label>{designFile && <><button type="button" onClick={handleDesignUpload} disabled={isUploadingDesign} className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isUploadingDesign ? "Indexing…" : "Upload design reference"}</button><p className="mt-2 rounded-lg bg-tertiary-container/20 px-2 py-1.5 text-[11px] font-medium text-tertiary">Ready for prototype governance</p></>}</div>
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4"><div className="mb-3 flex items-center justify-between"><span className="material-symbols-outlined text-primary">folder_open</span><span className="text-[10px] font-mono uppercase text-outline">Asset</span></div><p className="text-sm font-semibold">Campaign asset</p><p className="mt-1 min-h-10 text-xs text-on-surface-variant">Upload image, audio or video to open a real creator audit.</p><input id="campaign-asset" type="file" accept="image/png,image/jpeg,image/webp,audio/*,video/*" className="hidden" onChange={(event) => handleFileChange(event, setAssetFile)} /><label htmlFor="campaign-asset" className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary hover:underline"><span className="material-symbols-outlined text-[16px]">upload</span>{assetFile?.name ?? "Choose asset"}</label>{assetFile && <button type="button" onClick={() => createCreatorSubmission(selectedAsset, assetFile)} disabled={isCreating} className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isCreating ? "Opening creator…" : `Audit ${fileKind(assetFile) ?? "asset"}`}</button>}</div>
              </div>
            </section>

            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">02 / Governed canvas</p><h2 className="mt-1 text-xl font-bold">Pick a Blinkit Diwali starting point</h2><p className="mt-1 text-sm text-on-surface-variant">The right panel mirrors a test-sample gallery. It includes a safe poster and an intentional review case.</p></div><span className="rounded-lg bg-[#F8C200]/20 p-2 text-[#8a6800]"><span className="material-symbols-outlined">dashboard_customize</span></span></div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(270px,0.78fr)]">
                <label className="flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/35 bg-surface-container px-6 text-center transition hover:border-primary hover:bg-primary-container/5"><input type="file" accept="image/png,image/jpeg,image/webp,audio/*,video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0] ?? null; setAssetFile(file); if (file) notify("success", `${file.name} is ready. Audit it from the asset card.`); }} /><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary-container/10 text-primary"><span className="material-symbols-outlined text-[32px]">cloud_upload</span></span><span className="text-base font-bold">Drop a campaign asset here</span><span className="mt-2 max-w-sm text-sm text-on-surface-variant">or click to upload an image, audio or video for the Blinkit creator audit</span><span className="mt-5 rounded-full bg-surface-container-high px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-outline">PNG · JPG · MP3 · MP4</span></label>
                <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider">Try sample Diwali assets</span><span className="rounded-md border border-outline-variant/40 px-2 py-1 font-mono text-[10px] text-outline">Dataset demo</span></div><p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-error">Diwali poster samples</p><div className="space-y-2.5">{canvasAssets.filter((asset) => asset.kind === "IMAGE").map((asset) => <button type="button" key={asset.id} onClick={() => setSelectedAssetId(asset.id)} className={`w-full rounded-xl border p-2 text-left transition ${selectedAsset.id === asset.id ? "border-primary bg-primary-container/10 shadow-sm" : "border-outline-variant/25 bg-surface-container-low hover:border-primary/50"}`}><div className="flex items-center gap-3"><div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br ${asset.accent} text-[#1C1C1E]`}><span className="text-xl leading-none">{asset.festivalMark}</span><span className="mt-0.5 text-[8px] font-black uppercase">Diwali</span></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{asset.title}</p><p className="mt-0.5 truncate text-[11px] text-outline">{asset.description}</p></div><span className={`material-symbols-outlined text-[18px] ${asset.eventFit === "READY" ? "text-tertiary" : "text-error"}`}>{asset.eventFit === "READY" ? "check_circle" : "warning"}</span></div></button>)}</div><p className="mb-2 mt-4 text-[10px] font-mono uppercase tracking-wider text-primary">Other Diwali formats</p><div className="space-y-2.5">{canvasAssets.filter((asset) => asset.kind !== "IMAGE").map((asset) => <button type="button" key={asset.id} onClick={() => setSelectedAssetId(asset.id)} className={`w-full rounded-xl border p-2 text-left transition ${selectedAsset.id === asset.id ? "border-primary bg-primary-container/10 shadow-sm" : "border-outline-variant/25 bg-surface-container-low hover:border-primary/50"}`}><div className="flex items-center gap-3"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${asset.accent} text-[#1C1C1E]`}><span className="text-xl leading-none">{asset.festivalMark}</span></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{asset.title}</p><p className="mt-0.5 truncate text-[11px] text-outline">{asset.kind} · {asset.description}</p></div><span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span></div></button>)}</div></div>
              </div>
              <div className="mt-5 rounded-xl border border-outline-variant/30 bg-surface-container p-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><span className={`material-symbols-outlined ${selectedAsset.eventFit === "READY" ? "text-tertiary" : "text-error"}`}>{selectedAsset.eventFit === "READY" ? "verified" : "policy_alert"}</span><p className="text-sm font-bold">{selectedAsset.eventFit === "READY" ? "Diwali event fit: ready for review" : "Diwali event fit: needs review"}</p></div><p className="mt-1 text-xs leading-5 text-on-surface-variant">{selectedAsset.eventFit === "READY" ? "No cracker/firework direction is present in this canvas brief." : "This is deliberately unsafe: a fireworks/cracker direction must be flagged before approval."}</p></div><button type="button" onClick={() => createCreatorSubmission(selectedAsset)} disabled={isCreating} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"><span className="material-symbols-outlined text-[17px]">open_in_new</span>{isCreating ? "Opening…" : "Use in creator"}</button></div></div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5 shadow-sm"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">03 / Creator lane</p><h2 className="mt-1 text-xl font-bold">Problems are explained here</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">The creator chooses image, audio, text or video. Inkloom returns the finding, the governing rule and the safe correction.</p><div className="mt-5 space-y-3">{[["image", "Image", "palette + visual event rules"], ["graphic_eq", "Audio", "transcript + voiceover rules"], ["notes", "Text", "terms + verified claims"], ["movie", "Video", "frames + spoken copy"]].map(([icon, label, detail]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-outline-variant/25 bg-surface-container p-3"><span className="material-symbols-outlined rounded-lg bg-primary-container/15 p-2 text-primary">{icon}</span><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-outline">{detail}</p></div></div>)}</div><button type="button" onClick={() => openExistingSubmission(selectedAsset.kind)} className="mt-5 w-full rounded-lg border border-primary/40 bg-primary-container/10 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary-container/20">Open {selectedAsset.kind.toLowerCase()} creator lane</button></section>
            <section className="rounded-2xl border border-[#F8C200]/50 bg-[#fff9dc] p-5 shadow-sm dark:bg-[#2a2614]"><div className="flex items-start gap-3"><span className="material-symbols-outlined text-[#8a6800]">lightbulb</span><div><p className="text-sm font-bold text-[#5b4700] dark:text-[#f8d84f]">How the Diwali rule works</p><p className="mt-2 text-xs leading-5 text-[#6e5b16] dark:text-[#e7d98b]">A poster with no crackers or fireworks is event-safe. A poster that shows them is not automatically approved; it enters creator review with a visual finding.</p></div></div></section>
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">Readiness</h2><span className="font-mono text-xs text-tertiary">LIVE</span></div><div className="space-y-3">{[[Boolean(activeBrandId), "Blinkit profile connected"], [guidelineCount !== null && guidelineCount > 0, "Governance context indexed"], [Boolean(designFile), "Design reference staged"], [Boolean(selectedAsset), "Canvas ready"]].map(([ready, label]) => <div key={String(label)} className="flex items-center gap-2 text-xs"><span className={`material-symbols-outlined text-[17px] ${ready ? "text-tertiary" : "text-outline"}`}>{ready ? "check_circle" : "radio_button_unchecked"}</span><span className={ready ? "text-on-surface" : "text-outline"}>{label}</span></div>)}</div></section>
          </aside>
        </div>
      </div>
    </div>
  );
}
