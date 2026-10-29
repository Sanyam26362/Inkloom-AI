"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  Submission,
  AuditFinding,
  AuditExecutionResponse,
  WorkflowEvent,
  ReviewComment,
} from "@/lib/types";

type MediaKind = "IMAGE" | "AUDIO" | "VIDEO";

function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name)) return "IMAGE";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name)) return "VIDEO";
  if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name)) return "AUDIO";
  return null;
}

const AUDIT_STEPS = [
  "1. PII & Confidential Masking",
  "2. Deterministic Pattern Matching",
  "3. pgvector Semantic Chunk Retrieval",
  "4. Gemini Multimodal Audit",
  "5. Anti-Hallucination & Score Calculation",
];

function AuditWorkspaceContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams?.get("id");

  const { brands, activeBrand, activeBrandId, setActiveBrandId, currentRole, theme } = useApp();
  const isDark = theme === "dark";

  const targetBrandId = activeBrandId || brands.find((b) => b.name.toLowerCase() === "blinkit")?.id || brands[0]?.id;
  const requestedEvent = searchParams?.get("event");
  const isDiwaliEvent = requestedEvent === "diwali" || (
    !requestedEvent && (activeBrand?.name?.toLowerCase() === "blinkit" || !activeBrand)
  );

  // Submissions State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(
    queryId ? parseInt(queryId, 10) : null
  );
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);

  // Editor State
  const [editorContent, setEditorContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isSavingRevision, setIsSavingRevision] = useState<boolean>(false);
  const [revisionSummary, setRevisionSummary] = useState<string>("");
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);

  // Multi-Stage Audit Progress
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditStepIndex, setAuditStepIndex] = useState<number>(0);
  const [auditResult, setAuditResult] = useState<AuditExecutionResponse | null>(null);
  const [auditLatency, setAuditLatency] = useState<number | null>(null);

  // Finding Override & Resolution Modal
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Comments & Workflow
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowEvent[]>([]);
  const [showWorkflowDrawer, setShowWorkflowDrawer] = useState<boolean>(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState<boolean>(false);

  // Notifications & Filters
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [resolutionFilter, setResolutionFilter] = useState<string>("ALL");
  const [pageError, setPageError] = useState<string | null>(null);

  // Ingestion Modal State
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newFormat, setNewFormat] = useState<string>("TEXT");
  const [newInitialContent, setNewInitialContent] = useState<string>("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState<boolean>(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  // Fetch Submissions
  useEffect(() => {
    let ignore = false;
    async function fetchSubs() {
      if (!targetBrandId) return;
      if (!activeBrandId && targetBrandId) {
        setActiveBrandId(targetBrandId);
      }
      setPageError(null);
      try {
        const data = await api.listSubmissions(targetBrandId, undefined, { userRole: currentRole });
        if (!ignore) {
          setSubmissions(data);
          if (data.length > 0) {
            if (queryId) {
              const found = data.find((s) => s.id === parseInt(queryId, 10));
              if (found) {
                setSelectedSubmissionId(found.id);
                return;
              }
            }
            if (selectedSubmissionId && data.some((s) => s.id === selectedSubmissionId)) return;
            setSelectedSubmissionId(data[0].id);
          } else {
            setSelectedSubmissionId(null);
            setCurrentSubmission(null);
            setEditorContent("");
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setPageError(msg || "Failed to load submissions from backend.");
        }
      }
    }
    fetchSubs();
    return () => {
      ignore = true;
    };
  }, [targetBrandId, activeBrandId, currentRole, queryId, selectedSubmissionId, setActiveBrandId]);

  // Load Submission Details
  const loadSubmissionDetails = useCallback(
    async (id: number) => {
      setPageError(null);
      try {
        const sub = await api.getSubmission(id, { userRole: currentRole });
        setCurrentSubmission(sub);

        if (sub.revisions && sub.revisions.length > 0) {
          const latestRev = [...sub.revisions].sort(
            (a, b) => b.version_number - a.version_number
          )[0];
          setEditorContent(latestRev.content_body);
          setOriginalContent(latestRev.content_body);
        } else {
          setEditorContent("");
          setOriginalContent("");
        }

        const [cList, wList] = await Promise.all([
          api.listComments(id, { userRole: currentRole }).catch(() => []),
          api.listWorkflow(id, { userRole: currentRole }).catch(() => []),
        ]);
        setComments(cList);
        setWorkflowHistory(wList);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setPageError(msg || "Failed to load submission details.");
      }
    },
    [currentRole]
  );

  useEffect(() => {
    if (selectedSubmissionId) {
      loadSubmissionDetails(selectedSubmissionId);
    }
  }, [selectedSubmissionId, loadSubmissionDetails]);

  // Execute Real Audit with Stepper Progression
  const handleRunAudit = useCallback(async () => {
    if (!selectedSubmissionId) return;
    setIsAuditing(true);
    setAuditStepIndex(0);
    setStatusMessage(null);
    setPageError(null);

    // Progressive step indicator
    const stepInterval = setInterval(() => {
      setAuditStepIndex((prev) => (prev < AUDIT_STEPS.length - 1 ? prev + 1 : prev));
    }, 850);

    const startTime = performance.now();
    try {
      const response = await api.auditSubmission(
        selectedSubmissionId,
        { userRole: currentRole },
        isDiwaliEvent ? "diwali" : undefined
      );
      const elapsed = Math.round(performance.now() - startTime);
      setAuditResult(response);
      setAuditLatency(elapsed);

      await loadSubmissionDetails(selectedSubmissionId);
      setStatusMessage({
        type: "success",
        text: `Audit completed in ${elapsed}ms: Compliance Score ${response.compliance_score}%, ${response.total_findings} findings logged.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPageError(msg || "Audit execution failed on backend.");
    } finally {
      clearInterval(stepInterval);
      setIsAuditing(false);
    }
  }, [selectedSubmissionId, currentRole, isDiwaliEvent, loadSubmissionDetails]);

  // Keyboard shortcut ⌘+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunAudit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunAudit]);

  // Robust Replacement Method (Fuzzy & Whitespace-Tolerant)
  const handleApplyFix = (finding: AuditFinding) => {
    if (!finding.suggested_correction) return;

    const target = finding.flagged_excerpt.trim();
    if (!target) return;

    // 1. Direct match check
    if (editorContent.includes(target)) {
      setEditorContent((prev) => prev.replace(target, finding.suggested_correction || ""));
      setStatusMessage({
        type: "success",
        text: `Applied replacement "${finding.suggested_correction}". Click 'Save Revision' to commit.`,
      });
      return;
    }

    // 2. Whitespace & punctuation tolerant regex replacement
    try {
      const escaped = target
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s+/g, "\\s+");
      const regex = new RegExp(escaped, "i");
      if (regex.test(editorContent)) {
        setEditorContent((prev) => prev.replace(regex, finding.suggested_correction || ""));
        setStatusMessage({
          type: "success",
          text: `Applied replacement "${finding.suggested_correction}". Click 'Save Revision' to commit.`,
        });
        return;
      }
    } catch {
      // Fallback below
    }

    setStatusMessage({
      type: "error",
      text: `Excerpt "${finding.flagged_excerpt}" not located in current editor text. Please adjust manually.`,
    });
  };

  // Auto-Fix All Deterministic Findings
  const handleAutoFixAll = () => {
    if (!currentSubmission?.findings) return;
    let updated = editorContent;
    let appliedCount = 0;

    currentSubmission.findings.forEach((f) => {
      if (f.suggested_correction && f.flagged_excerpt) {
        const target = f.flagged_excerpt.trim();
        if (target && updated.includes(target)) {
          updated = updated.replaceAll(target, f.suggested_correction);
          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      setEditorContent(updated);
      setStatusMessage({
        type: "success",
        text: `Auto-fixed ${appliedCount} brand rule violations! Save revision to re-audit.`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: "No applicable automatic replacements found in copy.",
      });
    }
  };

  // Save new Revision
  const handleSaveRevision = async () => {
    if (!selectedSubmissionId || !editorContent.trim()) return;
    setIsSavingRevision(true);
    setStatusMessage(null);
    try {
      await api.createRevision(
        selectedSubmissionId,
        {
          content_body: editorContent,
          change_summary: revisionSummary || "Updated copy in Content Audit Workspace",
        },
        { userRole: currentRole }
      );
      setShowRevisionModal(false);
      setRevisionSummary("");
      await loadSubmissionDetails(selectedSubmissionId);
      setStatusMessage({
        type: "success",
        text: "New revision saved. Status reset to DRAFT for compliance audit.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: msg || "Failed to save revision.",
      });
    } finally {
      setIsSavingRevision(false);
    }
  };

  // Status Change Workflow Action
  const handleStatusChange = async (targetStatus: string, notes?: string) => {
    if (!selectedSubmissionId) return;

    if (targetStatus === "APPROVED" && currentRole === "CREATOR") {
      setStatusMessage({
        type: "error",
        text: "Permission Denied: CREATOR role cannot approve submissions. Switch to REVIEWER or MANAGER in the header.",
      });
      return;
    }

    setStatusMessage(null);
    try {
      await api.updateStatus(selectedSubmissionId, targetStatus, notes, { userRole: currentRole });
      await loadSubmissionDetails(selectedSubmissionId);
      setStatusMessage({
        type: "success",
        text: `Submission transitioned to ${targetStatus}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: msg || `Failed to transition status to ${targetStatus}.`,
      });
    }
  };

  // Submit Override Justification
  const handleSubmitOverride = async () => {
    if (!selectedFinding) return;

    if (currentRole === "CREATOR") {
      setOverrideError("Permission Denied: CREATOR role cannot authorize policy overrides.");
      return;
    }

    if (!overrideReason.trim()) {
      setOverrideError("Please provide a written business justification for this override.");
      return;
    }

    setIsSubmittingOverride(true);
    setOverrideError(null);
    try {
      await api.overrideFinding(selectedFinding.id, overrideReason.trim(), { userRole: currentRole });
      setSelectedFinding(null);
      setOverrideReason("");
      if (selectedSubmissionId) {
        await loadSubmissionDetails(selectedSubmissionId);
      }
      setStatusMessage({
        type: "success",
        text: `Finding #${selectedFinding.id} overridden. Metric ambiguity logged.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOverrideError(msg || "Override request rejected by backend.");
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Post Comment
  const handlePostComment = async () => {
    if (!selectedSubmissionId || !newCommentText.trim()) return;
    setIsPostingComment(true);
    try {
      await api.postComment(selectedSubmissionId, newCommentText.trim(), null, { userRole: currentRole });
      setNewCommentText("");
      const cList = await api.listComments(selectedSubmissionId, { userRole: currentRole });
      setComments(cList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: "error", text: msg || "Failed to post comment." });
    } finally {
      setIsPostingComment(false);
    }
  };

  // Create Submission
  const handleCreateSubmission = async () => {
    const isMediaFormat = newFormat === "IMAGE" || newFormat === "AUDIO" || newFormat === "VIDEO";
    if (!newTitle.trim() || (!isMediaFormat && !newInitialContent.trim()) || (isMediaFormat && !newMediaFile)) return;
    setIsCreatingSubmission(true);
    try {
      const initialContent = isMediaFormat
        ? `Pending ${newFormat.toLowerCase()} upload: ${newMediaFile?.name || "media asset"}`
        : newInitialContent.trim();
      const created = await api.createSubmission(
        {
          brand_id: activeBrandId,
          title: newTitle.trim(),
          content_format: newFormat,
          initial_content: initialContent,
        },
        { userRole: currentRole }
      );

      if (isMediaFormat && newMediaFile) {
        const uploadResult =
          newFormat === "IMAGE"
            ? await api.uploadImage(created.id, newMediaFile, { userRole: currentRole }, isDiwaliEvent ? "diwali" : undefined)
            : newFormat === "AUDIO"
            ? await api.uploadAudio(created.id, newMediaFile, { userRole: currentRole }, isDiwaliEvent ? "diwali" : undefined)
            : await api.uploadVideo(created.id, newMediaFile, { userRole: currentRole }, isDiwaliEvent ? "diwali" : undefined);
        setAuditResult(uploadResult);
      }

      setShowNewModal(false);
      setNewTitle("");
      setNewInitialContent("");
      setNewMediaFile(null);
      const freshSubs = await api.listSubmissions(activeBrandId, undefined, { userRole: currentRole });
      setSubmissions(freshSubs);
      setSelectedSubmissionId(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPageError(msg || "Failed to create submission.");
    } finally {
      setIsCreatingSubmission(false);
    }
  };

  const handleMediaUpload = async () => {
    if (!selectedSubmissionId || !mediaFile) return;
    const mediaType = getMediaKind(mediaFile);
    if (!mediaType) {
      setPageError("Unsupported media type.");
      return;
    }
    setIsUploadingMedia(true);
    try {
      const result =
        mediaType === "IMAGE"
          ? await api.uploadImage(selectedSubmissionId, mediaFile, { userRole: currentRole }, isDiwaliEvent ? "diwali" : undefined)
          : mediaType === "VIDEO"
          ? await api.uploadVideo(selectedSubmissionId, mediaFile, { userRole: currentRole }, isDiwaliEvent ? "diwali" : undefined)
          : await api.uploadAudio(selectedSubmissionId, mediaFile, { userRole: currentRole }, isDiwaliEvent ? "diwali" : undefined);
      setAuditResult(result);
      setMediaFile(null);
      await loadSubmissionDetails(selectedSubmissionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPageError(msg || "Failed to ingest media asset.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const wordCount = useMemo(() => {
    const trimmed = editorContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [editorContent]);

  const allFindings = useMemo(() => currentSubmission?.findings || [], [currentSubmission?.findings]);
  const filteredFindings = useMemo(() => {
    return allFindings.filter((f) => {
      if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
      if (resolutionFilter !== "ALL" && f.resolution_state !== resolutionFilter) return false;
      return true;
    });
  }, [allFindings, severityFilter, resolutionFilter]);

  const criticalCount = allFindings.filter((f) => f.severity === "CRITICAL").length;
  const warningCount = allFindings.filter((f) => f.severity === "WARNING").length;
  const suggestionCount = allFindings.filter((f) => f.severity === "SUGGESTION").length;
  const openCount = allFindings.filter((f) => f.resolution_state === "OPEN").length;

  const complianceScore = currentSubmission?.compliance_score ?? auditResult?.compliance_score ?? null;
  const isFullyCompliant = complianceScore != null && complianceScore >= 90 && openCount === 0;

  const latestRevision = currentSubmission?.revisions?.length
    ? [...currentSubmission.revisions].sort((a, b) => b.version_number - a.version_number)[0]
    : null;
  const latestMediaUrl = latestRevision?.media_urls?.[0] || null;
  const isAudioSubmission = currentSubmission?.content_format === "AUDIO";
  const isVideoSubmission = currentSubmission?.content_format === "VIDEO";
  const isImageSubmission = currentSubmission?.content_format === "IMAGE";

  return (
    <div className={`w-full min-h-screen p-4 sm:p-6 lg:p-8 font-mono ${isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"}`}>
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 border-3 border-black shadow-[6px_6px_0px_#000000] flex items-center gap-3 max-w-md ${
            statusMessage.type === "success"
              ? "bg-[var(--green)] text-[var(--ink)]"
              : "bg-[var(--red)] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {statusMessage.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="text-xs font-mono font-bold leading-snug flex-1">{statusMessage.text}</p>
          <button
            onClick={() => setStatusMessage(null)}
            className="w-6 h-6 border-2 border-black bg-white text-black font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {pageError && (
        <div className="mb-6 p-4 border-3 border-black bg-[var(--red)] text-white shadow-[4px_4px_0px_#000000] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]">warning</span>
            <span className="text-xs font-mono font-bold">{pageError}</span>
          </div>
          <button
            onClick={() => setPageError(null)}
            className="px-2.5 py-1 border-2 border-black bg-white text-black text-xs font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner: Responsible AI & Telemetry Shield */}
      <div className={`mb-6 p-3.5 border-3 ${isDark ? "border-[#383a45] bg-[#1c1d22]" : "border-black bg-[var(--white)] shadow-[4px_4px_0px_#101010]"} flex flex-wrap items-center justify-between gap-3 text-xs`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 border-2 border-black bg-[var(--blue)] flex items-center justify-center text-[var(--ink)] shadow-[2px_2px_0px_#000] shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <span className="font-mono font-black uppercase tracking-wider text-[var(--ink)] dark:text-white">
            GOVERNANCE LAYER ACTIVE:
          </span>
          <span className="text-[11px] font-mono text-[#555] dark:text-[#a0a5b5]">
            Reversible PII Masking · Gemini 2.5 Flash Grounded Retrieval · Human-in-the-Loop Override
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="border-2 border-black bg-[var(--green)] text-[var(--ink)] px-2 py-0.5 font-mono font-black text-[10px] uppercase shadow-[2px_2px_0px_#000]">
            ZERO-RETENTION MODE
          </span>
        </div>
      </div>

      {/* Command & Control Top Bar */}
      <section className={`w-full border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} p-4 sm:p-5 mb-6 flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Submission Selector */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            {/* Brand Card */}
            <div className={`flex items-center gap-2.5 px-3 py-2 border-2 border-black ${isDark ? "bg-[#25262c]" : "bg-[var(--yellow)]"} shadow-[3px_3px_0px_#000]`}>
              <span className="material-symbols-outlined text-[20px] text-[var(--ink)]">store</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-black uppercase tracking-wider text-[#444] dark:text-[#888]">
                  BRAND
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-[var(--ink)] uppercase truncate max-w-[160px]">
                  {activeBrand ? activeBrand.name : "Blinkit"}
                </span>
              </div>
            </div>

            {/* Submission Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedSubmissionId || ""}
                onChange={(e) => setSelectedSubmissionId(parseInt(e.target.value, 10))}
                className={`px-3 py-2 border-2 border-black ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"} font-mono font-bold text-xs shadow-[3px_3px_0px_#000] focus:outline-none cursor-pointer`}
              >
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>
                    SUB-#{s.id} [{s.status}]: {s.title.slice(0, 30)}...
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-3 py-2 border-2 border-black bg-[var(--pink)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>NEW DRAFT</span>
              </button>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleAutoFixAll}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2.5 border-2 border-black bg-[var(--blue)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
              <span>AUTO-FIX SAFE TERMS</span>
            </button>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing || !selectedSubmissionId}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border-3 border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs sm:text-sm uppercase shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[20px] ${isAuditing ? "animate-spin" : ""}`}>
                {isAuditing ? "refresh" : "play_circle"}
              </span>
              <span>{isAuditing ? "AUDITING..." : "RUN AUDIT"}</span>
              <span className="px-1.5 py-0.5 border border-black bg-white text-black text-[10px] font-mono font-black">
                ⌘+ENTER
              </span>
            </button>
          </div>
        </div>

        {/* Live Multi-Stage Stepper */}
        {isAuditing && (
          <div className={`mt-2 p-3.5 border-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--yellow)]/30"} shadow-[3px_3px_0px_#000]`}>
            <div className="flex items-center justify-between text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white mb-2">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                ACTIVE PIPELINE STAGE: {AUDIT_STEPS[auditStepIndex]}
              </span>
              <span>STAGE {auditStepIndex + 1} / {AUDIT_STEPS.length}</span>
            </div>
            <div className="w-full bg-black/20 h-3 border-2 border-black overflow-hidden">
              <div
                className="bg-[var(--yellow)] h-full transition-all duration-300 border-r-2 border-black"
                style={{ width: `${((auditStepIndex + 1) / AUDIT_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Two-Column Workbench Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className={`border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} overflow-hidden flex flex-col`}>
            {/* Editor Window Title Bar */}
            <div className={`px-4 py-3 border-b-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--ink)] text-white"} flex flex-wrap items-center justify-between gap-3`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 bg-[var(--yellow)] border border-black inline-block shrink-0" />
                <span className="font-mono font-black text-sm uppercase truncate max-w-sm">
                  {currentSubmission?.title || "Draft Content"}
                </span>
                <span className="px-2 py-0.5 border border-white bg-black text-white font-mono font-black text-[10px]">
                  v{currentSubmission?.current_version || 1}
                </span>
                <span className="px-2 py-0.5 border border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-[10px] uppercase shadow-[1px_1px_0px_#000]">
                  {currentSubmission?.status || "DRAFT"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editorContent !== originalContent && (
                  <button
                    onClick={() => setEditorContent(originalContent)}
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1 border-2 border-black bg-white text-black text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">undo</span>
                    <span>Revert</span>
                  </button>
                )}

                <button
                  onClick={() => setShowRevisionModal(true)}
                  type="button"
                  className="flex items-center gap-1 px-3 py-1 border-2 border-black bg-[var(--green)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  <span>Save Revision</span>
                </button>
              </div>
            </div>

            {/* Attached Media Strip */}
            <div className={`p-3.5 border-b-3 border-black ${isDark ? "bg-[#141518]" : "bg-[var(--paper)]"} flex flex-col gap-2.5`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#444] dark:text-[#a0a5b5] font-mono font-bold uppercase">
                  <span className="material-symbols-outlined text-[20px] text-[var(--ink)] dark:text-white">
                    {isImageSubmission ? "image" : isVideoSubmission ? "videocam" : "mic"}
                  </span>
                  <span>Attached Media Verification</span>
                </div>
                <label className="px-2.5 py-1 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white text-[11px] font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer">
                  Choose Media Asset
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {mediaFile && (
                <div className="flex items-center justify-between gap-2 p-2.5 border-2 border-black bg-[var(--yellow)]/30 text-xs font-mono">
                  <span className="truncate font-bold text-black dark:text-white">{mediaFile.name}</span>
                  <button
                    type="button"
                    onClick={handleMediaUpload}
                    disabled={isUploadingMedia}
                    className="px-3 py-1 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] font-mono font-black uppercase shadow-[2px_2px_0px_#000] disabled:opacity-50 hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                  >
                    {isUploadingMedia ? "Ingesting..." : "Ingest & Audit"}
                  </button>
                </div>
              )}

              {isAudioSubmission && latestMediaUrl && (
                <audio controls src={latestMediaUrl} className="w-full h-10 border-2 border-black" />
              )}
              {isVideoSubmission && latestMediaUrl && (
                <video controls src={latestMediaUrl} className="w-full max-h-60 border-2 border-black bg-black" />
              )}
              {isImageSubmission && latestMediaUrl && (
                <div className="border-2 border-black p-2 bg-white dark:bg-[#121316]">
                  <img src={latestMediaUrl} className="w-full max-h-72 object-contain" alt="Visual asset" />
                </div>
              )}
            </div>

            {/* Main Content Textarea */}
            <div className={`p-4 sm:p-5 min-h-[460px] flex flex-col ${isDark ? "bg-[#18191f]" : "bg-white"}`}>
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Enter or paste promotional copy, product claims, or ad scripts for governance audit..."
                className={`w-full flex-1 min-h-[420px] bg-transparent text-sm leading-relaxed resize-y focus:outline-none border-0 font-mono ${isDark ? "text-[#f5f0e7]" : "text-[var(--ink)]"}`}
              />
            </div>

            {/* Editor Footer Telemetry */}
            <div className={`px-4 py-2.5 border-t-3 border-black ${isDark ? "bg-[#1c1d22]" : "bg-[var(--paper)]"} flex items-center justify-between font-mono text-xs font-bold text-[#555] dark:text-[#a0a5b5]`}>
              <span>{wordCount} WORDS · {editorContent.length} CHARS</span>
              <span className="text-[var(--ink)] dark:text-white uppercase">ENGINE: GEMINI 2.5 FLASH + PGVECTOR</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Findings & Compliance Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Compliance Index Window */}
          <div className={`border-4 ${isDark ? "border-[#383a45] bg-[#18191f] shadow-[6px_6px_0px_#000000]" : "border-black bg-[var(--white)] shadow-[6px_6px_0px_#101010]"} p-4 sm:p-5 flex flex-col gap-3.5`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#666] dark:text-[#888]">
                  COMPLIANCE INDEX
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-3xl font-black text-[var(--ink)] dark:text-white">
                    {complianceScore != null ? `${complianceScore}%` : "NOT AUDITED"}
                  </span>
                  {complianceScore != null && (
                    <span className={`px-2 py-0.5 border-2 border-black font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] ${
                      isFullyCompliant
                        ? "bg-[var(--green)] text-[var(--ink)]"
                        : "bg-[var(--red)] text-white"
                    }`}>
                      {isFullyCompliant ? "COMPLIANT" : "POLICY ISSUES"}
                    </span>
                  )}
                </div>
              </div>

              {/* Severity Quick Filter Pills */}
              <div className="flex gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setSeverityFilter(severityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                  className={`p-2 border-2 border-black text-center cursor-pointer shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${
                    severityFilter === "CRITICAL" ? "bg-[var(--red)] text-white" : isDark ? "bg-[#25262c] text-white" : "bg-white text-black"
                  }`}
                >
                  <div className="font-mono font-black text-xs">{criticalCount}</div>
                  <div className="text-[9px] font-black uppercase">CRIT</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter(severityFilter === "WARNING" ? "ALL" : "WARNING")}
                  className={`p-2 border-2 border-black text-center cursor-pointer shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${
                    severityFilter === "WARNING" ? "bg-[var(--yellow)] text-black" : isDark ? "bg-[#25262c] text-white" : "bg-white text-black"
                  }`}
                >
                  <div className="font-mono font-black text-xs">{warningCount}</div>
                  <div className="text-[9px] font-black uppercase">WARN</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter(severityFilter === "SUGGESTION" ? "ALL" : "SUGGESTION")}
                  className={`p-2 border-2 border-black text-center cursor-pointer shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${
                    severityFilter === "SUGGESTION" ? "bg-[var(--blue)] text-black" : isDark ? "bg-[#25262c] text-white" : "bg-white text-black"
                  }`}
                >
                  <div className="font-mono font-black text-xs">{suggestionCount}</div>
                  <div className="text-[9px] font-black uppercase">SUGG</div>
                </button>
              </div>
            </div>
          </div>

          {/* Finding Cards List */}
          <div className="flex flex-col gap-3.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredFindings.length === 0 ? (
              <div className={`p-8 border-3 border-black text-center flex flex-col items-center ${isDark ? "bg-[#18191f]" : "bg-[var(--green)]/20 shadow-[4px_4px_0px_#000]"}`}>
                <span className="material-symbols-outlined text-[42px] text-[var(--ink)] dark:text-white mb-2">
                  verified_user
                </span>
                <p className="text-sm font-mono font-black uppercase text-[var(--ink)] dark:text-white">
                  NO OUTSTANDING VIOLATIONS
                </p>
                <p className="text-xs font-mono text-[#555] dark:text-[#a0a5b5] mt-1">
                  Copy completely aligns with corporate brand guidelines and verified facts.
                </p>
              </div>
            ) : (
              filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className={`p-4 border-3 border-black ${
                    isDark ? "bg-[#1c1d22]" : "bg-[var(--white)]"
                  } shadow-[4px_4px_0px_#000000] flex flex-col gap-2.5`}
                >
                  {/* Finding Header */}
                  <div className="flex items-center justify-between text-[10px] font-mono font-black">
                    <span className={`px-2 py-0.5 border border-black uppercase shadow-[1px_1px_0px_#000] ${
                      finding.severity === "CRITICAL"
                        ? "bg-[var(--red)] text-white"
                        : finding.severity === "WARNING"
                        ? "bg-[var(--yellow)] text-black"
                        : "bg-[var(--blue)] text-black"
                    }`}>
                      {finding.severity} · {finding.category}
                    </span>
                    <span className="text-[#666] dark:text-[#999] truncate max-w-[200px]">
                      {finding.guideline_citation || "Brand Policy"}
                    </span>
                  </div>

                  {/* Flagged Excerpt */}
                  <div className="p-2.5 border-2 border-black bg-[var(--red)]/10 font-mono text-xs font-bold text-[var(--red)] dark:text-[#ff7b72]">
                    “{finding.flagged_excerpt}”
                  </div>

                  {/* Explanation */}
                  <p className="text-xs font-mono leading-relaxed text-[#333] dark:text-[#c9d1d9]">
                    {finding.explanation}
                  </p>

                  {/* Suggested Correction */}
                  {finding.suggested_correction && (
                    <div className="p-2.5 border-2 border-black bg-[var(--green)]/20 flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-[var(--ink)] dark:text-white uppercase font-black flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">auto_fix</span>
                        APPROVED CONTEXT-PRESERVING FIX:
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--ink)] dark:text-[#b9f4a8]">
                        “{finding.suggested_correction}”
                      </span>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex items-center justify-between pt-2 border-t-2 border-black">
                    <div className="flex items-center gap-2">
                      {finding.suggested_correction && finding.resolution_state === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleApplyFix(finding)}
                          className="px-3 py-1 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
                        >
                          Apply Fix
                        </button>
                      )}
                    </div>

                    {finding.resolution_state === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFinding(finding);
                          setOverrideReason("");
                          setOverrideError(null);
                        }}
                        className="px-2.5 py-1 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center gap-1"
                      >
                        <span>Override Justification</span>
                        <span className="material-symbols-outlined text-[13px]">launch</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Workflow Transitions Panel */}
          <div className={`p-4 border-3 border-black ${isDark ? "bg-[#18191f]" : "bg-[var(--white)] shadow-[4px_4px_0px_#000]"} flex flex-wrap items-center justify-between gap-3`}>
            <span className="text-xs font-mono font-black uppercase text-[var(--ink)] dark:text-white">
              ROLE PRIVILEGE: {currentRole}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("CHANGES_REQUESTED", "Revisions required for brand alignment.")}
                className="px-3 py-1.5 border-2 border-black bg-[var(--red)] text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("APPROVED", "All brand guidelines verified.")}
                className="px-3 py-1.5 border-2 border-black bg-[var(--green)] text-[var(--ink)] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Approve Publication
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Override Exemption Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
          <div className={`w-full max-w-lg border-4 border-black ${isDark ? "bg-[#141518] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"} shadow-[8px_8px_0px_#000000] p-5 sm:p-6 flex flex-col gap-4`}>
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <span className="font-mono font-black text-sm uppercase">AUTHORIZE BRAND EXEMPTION</span>
              <button
                onClick={() => setSelectedFinding(null)}
                className="w-6 h-6 border-2 border-black bg-[var(--red)] text-white font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 border-2 border-black bg-[var(--red)]/10 text-xs">
              <span className="text-[var(--red)] font-bold">“{selectedFinding.flagged_excerpt}”</span>
              <p className="mt-1 text-[#444] dark:text-[#a0a5b5]">{selectedFinding.explanation}</p>
            </div>

            {currentRole === "CREATOR" ? (
              <div className="p-3 border-2 border-black bg-[var(--red)] text-white text-xs font-bold">
                Permission Denied: Only REVIEWER or MANAGER roles may authorize policy exemptions.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase">Business Exemption Reason:</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Approved exception by Marketing VP for festive satirical reel."
                  className={`w-full h-24 p-2.5 border-2 border-black text-xs font-mono focus:outline-none ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"}`}
                />
              </div>
            )}

            {overrideError && <span className="text-[var(--red)] text-xs font-bold">{overrideError}</span>}

            <div className="flex justify-end gap-2 border-t-2 border-black pt-3">
              <button
                onClick={() => setSelectedFinding(null)}
                className="px-3 py-1.5 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              {currentRole !== "CREATOR" && (
                <button
                  onClick={handleSubmitOverride}
                  disabled={isSubmittingOverride}
                  className="px-4 py-1.5 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOverride ? "Saving..." : "Authorize Override"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
          <div className={`w-full max-w-md border-4 border-black ${isDark ? "bg-[#141518] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"} shadow-[8px_8px_0px_#000000] p-5 sm:p-6 flex flex-col gap-4`}>
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <span className="font-mono font-black text-sm uppercase">COMMIT CONTENT REVISION</span>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="w-6 h-6 border-2 border-black bg-[var(--red)] text-white font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={revisionSummary}
              onChange={(e) => setRevisionSummary(e.target.value)}
              placeholder="e.g. Corrected superlatives and unverified speed claims."
              className={`w-full h-10 px-3 border-2 border-black text-xs font-mono focus:outline-none ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"}`}
            />
            <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRevision}
                disabled={isSavingRevision}
                className="px-4 py-1.5 border-2 border-black bg-[var(--green)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingRevision ? "Saving..." : "Commit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Submission Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
          <div className={`w-full max-w-lg border-4 border-black ${isDark ? "bg-[#141518] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"} shadow-[8px_8px_0px_#000000] p-5 sm:p-6 flex flex-col gap-4`}>
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <span className="font-mono font-black text-sm uppercase">NEW CONTENT SUBMISSION</span>
              <button
                onClick={() => setShowNewModal(false)}
                className="w-6 h-6 border-2 border-black bg-[var(--red)] text-white font-black text-xs flex items-center justify-center hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Asset Title e.g. Diwali Flash Sale Announcement"
              className={`w-full h-10 px-3 border-2 border-black text-xs font-mono focus:outline-none ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"}`}
            />
            <textarea
              value={newInitialContent}
              onChange={(e) => setNewInitialContent(e.target.value)}
              placeholder="Initial copy draft..."
              className={`w-full h-32 p-3 border-2 border-black text-xs font-mono focus:outline-none ${isDark ? "bg-[#1c1d22] text-white" : "bg-white text-black"}`}
            />
            <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 border-2 border-black bg-white dark:bg-[#25262c] text-black dark:text-white text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmission}
                disabled={isCreatingSubmission || !newTitle.trim()}
                className="px-4 py-1.5 border-2 border-black bg-[var(--yellow)] text-[var(--ink)] text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {isCreatingSubmission ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentAuditWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-sm">Loading Workspace...</div>}>
      <AuditWorkspaceContent />
    </Suspense>
  );
}
