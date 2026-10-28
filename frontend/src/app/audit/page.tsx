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

  const { brands, activeBrand, activeBrandId, setActiveBrandId, currentRole } = useApp();
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
  const scoreVal = complianceScore != null ? complianceScore : 0;
  const isFullyCompliant = complianceScore != null && complianceScore >= 90 && openCount === 0;

  const latestRevision = currentSubmission?.revisions?.length
    ? [...currentSubmission.revisions].sort((a, b) => b.version_number - a.version_number)[0]
    : null;
  const latestMediaUrl = latestRevision?.media_urls?.[0] || null;
  const isAudioSubmission = currentSubmission?.content_format === "AUDIO";
  const isVideoSubmission = currentSubmission?.content_format === "VIDEO";
  const isImageSubmission = currentSubmission?.content_format === "IMAGE";

  return (
    <div className="relative w-full px-gutter-desktop pb-margin-desktop bg-surface text-on-surface">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-space-md rounded-xl shadow-2xl border flex items-center gap-space-sm max-w-md ${
            statusMessage.type === "success"
              ? "bg-surface-container-high border-tertiary/40 text-on-surface"
              : "bg-surface-container-high border-error/40 text-on-surface"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${statusMessage.type === "success" ? "text-tertiary" : "text-error"}`}>
            {statusMessage.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="text-[13px] leading-snug flex-1">{statusMessage.text}</p>
          <button onClick={() => setStatusMessage(null)} className="text-outline hover:text-on-surface text-[16px]">✕</button>
        </div>
      )}

      {/* Global Error Banner */}
      {pageError && (
        <div className="mb-space-md p-space-md rounded-xl bg-error-container/20 border border-error/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <span className="text-[13px] text-error font-medium">{pageError}</span>
          </div>
          <button onClick={() => setPageError(null)} className="text-[11px] text-outline hover:text-on-surface font-mono">Dismiss</button>
        </div>
      )}

      {/* Responsible AI & Confidentiality Shield Badge */}
      <div className="mb-space-md px-space-md py-2 rounded-xl bg-surface-container-low border border-primary/20 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span className="font-semibold text-on-surface">Responsible Brand Governance Layer Active:</span>
          <span className="text-on-surface-variant font-mono">Reversible PII Masking · Gemini 2.5 Flash Grounded Citations · Human Override In Loop</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-mono text-[10px] font-semibold uppercase">
          Zero-Retention Mode
        </span>
      </div>

      {/* Command & Control Top Bar */}
      <section className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-space-md mb-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md flex-wrap min-w-0">
            <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-1.5 rounded-lg border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Governing Brand</span>
                <span className="font-headline-sm text-[13px] text-on-surface font-semibold truncate max-w-[200px]">
                  {activeBrand ? activeBrand.name : "Blinkit"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSubmissionId || ""}
                onChange={(e) => setSelectedSubmissionId(parseInt(e.target.value, 10))}
                className="bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1.5 text-[13px] text-on-surface font-medium cursor-pointer"
              >
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>
                    SUB-#{s.id} ({s.status}): {s.title.slice(0, 32)}...
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-[11px] font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>New Draft</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <button
              onClick={handleAutoFixAll}
              type="button"
              className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-secondary hover:text-on-surface text-[13px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">auto_fix_high</span>
              <span>Auto-Fix Safe Terms</span>
            </button>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing || !selectedSubmissionId}
              type="button"
              className="flex items-center gap-2 px-space-lg py-2 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-[13px] font-semibold shadow-[0_0_14px_rgba(124,58,237,0.4)] cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${isAuditing ? "animate-spin" : ""}`}>
                {isAuditing ? "refresh" : "play_circle"}
              </span>
              <span>{isAuditing ? "Auditing Pipeline..." : "Run Audit"}</span>
              <span className="px-1.5 py-0.5 rounded bg-on-primary-container/20 text-[10px] font-mono">⌘+Enter</span>
            </button>
          </div>
        </div>

        {/* Live Multi-Stage Audit Progress Bar */}
        {isAuditing && (
          <div className="w-full mt-2 p-3 rounded-lg bg-surface-container border border-primary/30 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                Current Stage: {AUDIT_STEPS[auditStepIndex]}
              </span>
              <span>Stage {auditStepIndex + 1} of {AUDIT_STEPS.length}</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((auditStepIndex + 1) / AUDIT_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        {/* LEFT PANE: Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm flex flex-col">
            <div className="bg-surface-container-lowest px-space-md py-space-sm flex flex-wrap items-center justify-between gap-space-sm border-b border-outline-variant/20">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-headline-sm text-[15px] text-on-surface font-semibold truncate max-w-sm">
                  {currentSubmission?.title || "Draft Content"}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px]">
                  v{currentSubmission?.current_version || 1}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase bg-surface-container-highest text-on-surface-variant">
                  {currentSubmission?.status || "DRAFT"}
                </span>
              </div>

              <div className="flex items-center gap-space-xs">
                {editorContent !== originalContent && (
                  <button
                    onClick={() => setEditorContent(originalContent)}
                    type="button"
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-[12px]"
                  >
                    <span className="material-symbols-outlined text-[14px]">undo</span>
                    <span>Revert</span>
                  </button>
                )}

                <button
                  onClick={() => setShowRevisionModal(true)}
                  type="button"
                  className="flex items-center gap-1 px-space-sm py-1 rounded bg-primary-container text-on-primary-container hover:bg-primary-container/90 text-[12px] font-medium"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  <span>Save Revision</span>
                </button>
              </div>
            </div>

            {/* Media Upload and Preview Strip */}
            <div className="px-space-md py-space-sm bg-surface-container-lowest border-b border-outline-variant/20 flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {isImageSubmission ? "image" : isVideoSubmission ? "videocam" : "mic"}
                  </span>
                  <span>Attached Media Verification</span>
                </div>
                <label className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-[11px] text-on-surface cursor-pointer">
                  Upload file
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {mediaFile && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container text-[11px]">
                  <span className="truncate text-on-surface">{mediaFile.name}</span>
                  <button
                    type="button"
                    onClick={handleMediaUpload}
                    disabled={isUploadingMedia}
                    className="px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-semibold disabled:opacity-50"
                  >
                    {isUploadingMedia ? "Ingesting..." : "Ingest & Audit"}
                  </button>
                </div>
              )}

              {isAudioSubmission && latestMediaUrl && (
                <audio controls src={latestMediaUrl} className="w-full h-9" />
              )}
              {isVideoSubmission && latestMediaUrl && (
                <video controls src={latestMediaUrl} className="w-full max-h-56 rounded-lg bg-black" />
              )}
              {isImageSubmission && latestMediaUrl && (
                <img src={latestMediaUrl} className="w-full max-h-72 object-contain rounded-lg bg-surface-container" alt="Visual asset" />
              )}
            </div>

            {/* Main Textarea */}
            <div className="p-space-lg bg-surface min-h-[500px] flex flex-col">
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Enter or paste promotional copy, product claims, or ad scripts for governance audit..."
                className="w-full flex-1 min-h-[440px] bg-transparent text-on-surface text-[15px] leading-relaxed resize-y focus:outline-none border-0"
              />
            </div>

            <div className="bg-surface-container-lowest px-space-md py-space-sm flex items-center justify-between text-outline font-mono text-[11px] border-t border-outline-variant/20">
              <span>{wordCount} words · {editorContent.length} chars</span>
              <span className="text-secondary">Engine: Google Gemini 2.5 Flash + pgvector</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Findings Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-outline uppercase tracking-wider">Compliance Index</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[28px] font-semibold text-on-surface">
                    {complianceScore != null ? `${complianceScore}%` : "Not Audited"}
                  </span>
                  {complianceScore != null && (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${isFullyCompliant ? "bg-tertiary-container text-tertiary" : "bg-error-container text-error"}`}>
                      {isFullyCompliant ? "Compliant" : "Policy Issues"}
                    </span>
                  )}
                </div>
              </div>

              {/* Severity Quick Pills */}
              <div className="flex gap-1.5 text-center font-mono">
                <button
                  onClick={() => setSeverityFilter(severityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                  className={`p-2 rounded border text-xs ${severityFilter === "CRITICAL" ? "bg-error/20 border-error" : "bg-surface-container"}`}
                >
                  <div className="font-bold text-error">{criticalCount}</div>
                  <div className="text-[9px] uppercase">Crit</div>
                </button>
                <button
                  onClick={() => setSeverityFilter(severityFilter === "WARNING" ? "ALL" : "WARNING")}
                  className={`p-2 rounded border text-xs ${severityFilter === "WARNING" ? "bg-secondary/20 border-secondary" : "bg-surface-container"}`}
                >
                  <div className="font-bold text-secondary">{warningCount}</div>
                  <div className="text-[9px] uppercase">Warn</div>
                </button>
                <button
                  onClick={() => setSeverityFilter(severityFilter === "SUGGESTION" ? "ALL" : "SUGGESTION")}
                  className={`p-2 rounded border text-xs ${severityFilter === "SUGGESTION" ? "bg-primary/20 border-primary" : "bg-surface-container"}`}
                >
                  <div className="font-bold text-primary">{suggestionCount}</div>
                  <div className="text-[9px] uppercase">Sugg</div>
                </button>
              </div>
            </div>
          </div>

          {/* Finding Cards */}
          <div className="flex flex-col gap-space-md max-h-[560px] overflow-y-auto pr-1">
            {filteredFindings.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-container-low border border-outline-variant/30 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-tertiary text-[36px] mb-2">verified_user</span>
                <p className="text-[14px] font-semibold text-on-surface">No Outstanding Violations</p>
                <p className="text-[12px] text-outline mt-1">Copy aligns with corporate rules and verified facts.</p>
              </div>
            ) : (
              filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className={`p-space-md rounded-xl bg-surface-container-low border flex flex-col gap-space-sm ${
                    finding.severity === "CRITICAL" ? "border-error/40" : "border-outline-variant/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded font-bold uppercase bg-surface-container-highest text-on-surface">
                      {finding.severity} · {finding.category}
                    </span>
                    <span className="text-outline">{finding.guideline_citation || "Brand Policy"}</span>
                  </div>

                  <div className="p-2 rounded bg-surface-container font-mono text-[12px] text-error border border-error/20">
                    “{finding.flagged_excerpt}”
                  </div>

                  <p className="text-[12px] text-on-surface-variant leading-relaxed">
                    {finding.explanation}
                  </p>

                  {finding.suggested_correction && (
                    <div className="p-2 rounded bg-surface-container border border-tertiary/20 flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-tertiary uppercase font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">auto_fix</span>
                        Approved Context-Preserving Fix
                      </span>
                      <span className="font-mono text-[12px] text-on-surface">
                        “{finding.suggested_correction}”
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      {finding.suggested_correction && finding.resolution_state === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleApplyFix(finding)}
                          className="px-3 py-1 rounded bg-primary-container text-on-primary-container text-[11px] font-semibold hover:bg-primary-container/90"
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
                        className="text-outline hover:text-primary font-mono text-[10px] uppercase tracking-wider flex items-center gap-1"
                      >
                        <span>Override with Justification</span>
                        <span className="material-symbols-outlined text-[14px]">launch</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Workflow Transitions Panel */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 flex items-center justify-between">
            <span className="text-[12px] font-mono text-outline">Role: {currentRole}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("CHANGES_REQUESTED", "Revisions required for brand alignment.")}
                className="px-3 py-1.5 rounded bg-error-container text-error text-[11px] font-semibold"
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("APPROVED", "All brand guidelines verified.")}
                className="px-3 py-1.5 rounded bg-tertiary-container text-on-tertiary-container text-[11px] font-semibold"
              >
                Approve Publication
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Override Exemption Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="font-semibold text-on-surface">Authorize Brand Exemption</span>
              <button onClick={() => setSelectedFinding(null)} className="text-outline">✕</button>
            </div>

            <div className="p-2.5 rounded bg-surface-container text-xs">
              <span className="text-error font-mono">“{selectedFinding.flagged_excerpt}”</span>
              <p className="mt-1 text-on-surface-variant">{selectedFinding.explanation}</p>
            </div>

            {currentRole === "CREATOR" ? (
              <div className="p-3 rounded bg-error-container/20 border border-error/30 text-error text-xs">
                Only REVIEWER or MANAGER roles may authorize policy exemptions.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant font-medium">Business Exemption Reason:</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Approved exception by Marketing VP for festive satirical reel."
                  className="w-full h-24 p-2.5 rounded-lg bg-surface-container text-on-surface text-xs border border-outline-variant/30"
                />
              </div>
            )}

            {overrideError && <span className="text-error text-xs">{overrideError}</span>}

            <div className="flex justify-end gap-2 border-t border-outline-variant/20 pt-2">
              <button onClick={() => setSelectedFinding(null)} className="px-3 py-1 text-xs">Cancel</button>
              {currentRole !== "CREATOR" && (
                <button
                  onClick={handleSubmitOverride}
                  disabled={isSubmittingOverride}
                  className="px-4 py-1.5 rounded bg-primary-container text-on-primary-container text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg flex flex-col gap-space-md">
            <span className="font-semibold text-on-surface">Commit Revision</span>
            <input
              type="text"
              value={revisionSummary}
              onChange={(e) => setRevisionSummary(e.target.value)}
              placeholder="e.g. Corrected superlatives and unverified speed claims."
              className="w-full h-10 px-3 rounded-lg bg-surface-container text-xs border border-outline-variant/30"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button onClick={() => setShowRevisionModal(false)} className="px-3 py-1 text-xs">Cancel</button>
              <button
                onClick={handleSaveRevision}
                disabled={isSavingRevision}
                className="px-4 py-1.5 rounded bg-primary-container text-on-primary-container text-xs font-semibold"
              >
                {isSavingRevision ? "Saving..." : "Commit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Submission Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg flex flex-col gap-space-md">
            <span className="font-semibold text-on-surface">New Content Submission</span>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Asset Title e.g. Diwali Flash Sale Announcement"
              className="w-full h-10 px-3 rounded-lg bg-surface-container text-xs border border-outline-variant/30"
            />
            <textarea
              value={newInitialContent}
              onChange={(e) => setNewInitialContent(e.target.value)}
              placeholder="Initial copy draft..."
              className="w-full h-32 p-3 rounded-lg bg-surface-container text-xs border border-outline-variant/30"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button onClick={() => setShowNewModal(false)} className="px-3 py-1 text-xs">Cancel</button>
              <button
                onClick={handleCreateSubmission}
                disabled={isCreatingSubmission || !newTitle.trim()}
                className="px-4 py-1.5 rounded bg-primary-container text-on-primary-container text-xs font-semibold"
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