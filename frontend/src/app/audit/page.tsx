"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
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

function AuditWorkspaceContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const { activeBrand, activeBrandId, currentRole } = useApp();

  // State
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

  // Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AuditExecutionResponse | null>(null);
  const [auditLatency, setAuditLatency] = useState<number | null>(null);

  // Finding Override & Resolution Modal
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Workflow & Comments
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowEvent[]>([]);
  const [showWorkflowDrawer, setShowWorkflowDrawer] = useState<boolean>(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState<boolean>(false);

  // Status transition state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter & UI State
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [resolutionFilter, setResolutionFilter] = useState<string>("ALL");
  const [pageError, setPageError] = useState<string | null>(null);

  // New Submission Modal State
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newFormat, setNewFormat] = useState<string>("TEXT");
  const [newInitialContent, setNewInitialContent] = useState<string>("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState<boolean>(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  // 1. Fetch Submissions for Active Brand
  useEffect(() => {
    let ignore = false;
    async function fetchSubs() {
      if (!activeBrandId) return;
      setPageError(null);
      try {
        const data = await api.listSubmissions(activeBrandId, undefined, { userRole: currentRole });
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
            if (selectedSubmissionId && data.some((s) => s.id === selectedSubmissionId)) {
              return;
            }
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
  }, [activeBrandId, currentRole, queryId, selectedSubmissionId]);

  // 2. Fetch Selected Submission Details
  const loadSubmissionDetails = useCallback(
    async (id: number) => {
      setPageError(null);
      try {
        const sub = await api.getSubmission(id, { userRole: currentRole });
        setCurrentSubmission(sub);

        // Get latest revision body
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

        // Load Comments & Workflow
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
    let ignore = false;
    async function loadDetails() {
      if (!selectedSubmissionId) return;
      try {
        const sub = await api.getSubmission(selectedSubmissionId, { userRole: currentRole });
        if (!ignore) {
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
        }

        const [cList, wList] = await Promise.all([
          api.listComments(selectedSubmissionId, { userRole: currentRole }).catch(() => []),
          api.listWorkflow(selectedSubmissionId, { userRole: currentRole }).catch(() => []),
        ]);
        if (!ignore) {
          setComments(cList);
          setWorkflowHistory(wList);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setPageError(msg || "Failed to load submission details.");
        }
      }
    }
    loadDetails();
    return () => {
      ignore = true;
    };
  }, [selectedSubmissionId, currentRole]);

  // Execute Real Audit
  const handleRunAudit = useCallback(async () => {
    if (!selectedSubmissionId) return;
    setIsAuditing(true);
    setStatusMessage(null);
    setPageError(null);
    const startTime = performance.now();
    try {
      const response = await api.auditSubmission(selectedSubmissionId, { userRole: currentRole });
      const elapsed = Math.round(performance.now() - startTime);
      setAuditResult(response);
      setAuditLatency(elapsed);

      // Refresh submission to get freshly logged findings & updated score
      await loadSubmissionDetails(selectedSubmissionId);
      setStatusMessage({
        type: "success",
        text: `Audit completed in ${elapsed}ms: Score ${response.compliance_score}%, ${response.total_findings} findings evaluated.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPageError(msg || "Audit execution failed on backend.");
    } finally {
      setIsAuditing(false);
    }
  }, [selectedSubmissionId, currentRole, loadSubmissionDetails]);

  // Keyboard shortcut ⌘+Enter / Ctrl+Enter to trigger audit
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
        text: "New revision saved successfully. Status reset to DRAFT for compliance audit.",
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

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await api.updateStatus(selectedSubmissionId, targetStatus, notes, { userRole: currentRole });
      await loadSubmissionDetails(selectedSubmissionId);
      setStatusMessage({
        type: "success",
        text: `Submission status transitioned to ${targetStatus}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: msg || `Failed to transition status to ${targetStatus}.`,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Apply Single Fix from Finding
  const handleApplyFix = (finding: AuditFinding) => {
    if (!finding.suggested_correction) return;
    if (editorContent.includes(finding.flagged_excerpt)) {
      const newText = editorContent.replace(finding.flagged_excerpt, finding.suggested_correction);
      setEditorContent(newText);
      setStatusMessage({
        type: "success",
        text: `Applied replacement "${finding.suggested_correction}" into editor. Click 'Save Revision' to persist.`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: `Excerpt "${finding.flagged_excerpt}" not found directly in current editor text.`,
      });
    }
  };

  // Auto-Fix All Deterministic Suggestions
  const handleAutoFixAll = () => {
    if (!currentSubmission?.findings) return;
    let updated = editorContent;
    let appliedCount = 0;

    currentSubmission.findings.forEach((f) => {
      if (f.suggested_correction && updated.includes(f.flagged_excerpt)) {
        updated = updated.replaceAll(f.flagged_excerpt, f.suggested_correction);
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      setEditorContent(updated);
      setStatusMessage({
        type: "success",
        text: `Auto-fixed ${appliedCount} deterministic brand rules into editor! Review changes and save a revision.`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: "No applicable automatic replacements found in current copy.",
      });
    }
  };

  // Resolve Finding
  const handleResolveFinding = async (findingId: number) => {
    try {
      await api.resolveFinding(findingId, "RESOLVED", { userRole: currentRole });
      if (selectedSubmissionId) {
        await loadSubmissionDetails(selectedSubmissionId);
      }
      setStatusMessage({
        type: "success",
        text: `Finding #${findingId} marked as RESOLVED.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: msg || "Failed to resolve finding.",
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
        text: `Finding #${selectedFinding.id} overridden with authorized justification. Ambiguity metrics updated.`,
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
      setStatusMessage({
        type: "error",
        text: msg || "Failed to post comment.",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  // Create Submission
  const handleCreateSubmission = async () => {
    const isMediaFormat = newFormat === "AUDIO" || newFormat === "VIDEO";
    if (!newTitle.trim() || (!isMediaFormat && !newInitialContent.trim()) || (isMediaFormat && !newMediaFile)) {
      return;
    }
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
          newFormat === "AUDIO"
            ? await api.uploadAudio(created.id, newMediaFile, { userRole: currentRole })
            : await api.uploadVideo(created.id, newMediaFile, { userRole: currentRole });
        setAuditResult(uploadResult);
      }

      setShowNewModal(false);
      setNewTitle("");
      setNewInitialContent("");
      setNewMediaFile(null);
      const freshSubs = await api.listSubmissions(activeBrandId, undefined, { userRole: currentRole });
      setSubmissions(freshSubs);
      setSelectedSubmissionId(created.id);
      setStatusMessage({
        type: "success",
        text: newMediaFile
          ? `New ${newFormat.toLowerCase()} submission "${created.title}" ingested and audited.`
          : `New submission "${created.title}" created. You can now execute audits.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPageError(msg || "Failed to create submission.");
    } finally {
      setIsCreatingSubmission(false);
    }
  };

  const handleMediaUpload = async () => {
    if (!selectedSubmissionId || !mediaFile) return;
    const mediaType = mediaFile.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(mediaFile.name)
      ? "VIDEO"
      : "AUDIO";
    setIsUploadingMedia(true);
    setPageError(null);
    try {
      const result =
        mediaType === "VIDEO"
          ? await api.uploadVideo(selectedSubmissionId, mediaFile, { userRole: currentRole })
          : await api.uploadAudio(selectedSubmissionId, mediaFile, { userRole: currentRole });
      setAuditResult(result);
      setMediaFile(null);
      await loadSubmissionDetails(selectedSubmissionId);
      setStatusMessage({
        type: "success",
        text: `${mediaType === "VIDEO" ? "Video" : "Audio"} ingested, transcript extracted, and audited against Blinkit guidelines.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPageError(msg || `Failed to ingest ${mediaType.toLowerCase()} asset.`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Computed word & char count
  const wordCount = useMemo(() => {
    const trimmed = editorContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [editorContent]);

  const charCount = editorContent.length;

  // Findings filtering
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

  // Compliance score from submission or audit response
  const complianceScore =
    currentSubmission?.compliance_score ?? auditResult?.compliance_score ?? null;

  const scoreVal = complianceScore != null ? complianceScore : 0;
  const latestRevision = currentSubmission?.revisions?.length
    ? [...currentSubmission.revisions].sort((a, b) => b.version_number - a.version_number)[0]
    : null;
  const latestMediaUrl = latestRevision?.media_urls?.[0] || null;
  const isAudioSubmission = currentSubmission?.content_format === "AUDIO";
  const isVideoSubmission = currentSubmission?.content_format === "VIDEO";

  return (
    <div className="relative w-full px-gutter-desktop pb-margin-desktop bg-surface text-on-surface">
      {/* Status & Notification Toast */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-space-md rounded-xl shadow-2xl border flex items-center gap-space-sm max-w-md transition-all ${
            statusMessage.type === "success"
              ? "bg-surface-container-high border-tertiary/40 text-on-surface"
              : "bg-surface-container-high border-error/40 text-on-surface"
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] shrink-0 ${
              statusMessage.type === "success" ? "text-tertiary" : "text-error"
            }`}
          >
            {statusMessage.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="text-[13px] leading-snug flex-1">{statusMessage.text}</p>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-outline hover:text-on-surface text-[16px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error Alert */}
      {pageError && (
        <div className="mb-space-md p-space-md rounded-xl bg-error-container/20 border border-error/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <span className="text-[13px] text-error font-medium">{pageError}</span>
          </div>
          <button
            onClick={() => setPageError(null)}
            className="text-[11px] text-outline hover:text-on-surface uppercase font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Command & Control Governance Top Bar */}
      <section className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-space-md mb-space-lg shadow-sm flex flex-col gap-space-md">
        {/* Row 1: Profile Selector, Submission Dropdown & Core Actions */}
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          {/* Left: Active Brand & Submission Selector */}
          <div className="flex items-center gap-space-md flex-wrap min-w-0">
            {/* Governing Profile Tag */}
            <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-1.5 rounded-lg border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                  Governing Profile
                </span>
                <span className="font-headline-sm text-[13px] text-on-surface font-semibold truncate max-w-[200px]">
                  {activeBrand ? activeBrand.name : "Blinkit"}
                </span>
              </div>
            </div>

            {/* Submission Dropdown Selector */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedSubmissionId || ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    setSelectedSubmissionId(id);
                  }}
                  className="bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-1.5 text-[13px] text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
                >
                  {submissions.map((s) => (
                    <option key={s.id} value={s.id} className="bg-surface-container-high text-on-surface">
                      SUB-#{s.id} ({s.status}): {s.title.slice(0, 32)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* New Draft Button */}
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-label-sm text-[11px] font-medium flex items-center gap-1 transition-colors"
                title="Create a new submission draft for this brand"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>New Draft</span>
              </button>
            </div>

            {/* Live Ruleset Active indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-space-sm py-1 rounded bg-tertiary-container/30 text-tertiary border border-tertiary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="font-label-sm text-[10px] uppercase font-semibold font-mono tracking-wider">
                Live Dual-Gate Active
              </span>
            </div>
          </div>

          {/* Right: Action CTA Cluster */}
          <div className="flex items-center gap-space-sm">
            {/* Auto-Fix Deterministic Terms */}
            <button
              onClick={handleAutoFixAll}
              type="button"
              className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-secondary hover:text-on-surface transition-all font-body-sm text-[13px] cursor-pointer"
              title="Replaces banned terms with backend suggested corrections in editor"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">auto_fix_high</span>
              <span>Auto-Fix Safe Terms</span>
            </button>

            {/* Run Audit Button */}
            <button
              onClick={handleRunAudit}
              disabled={isAuditing || !selectedSubmissionId}
              type="button"
              className="flex items-center gap-2 px-space-lg py-2 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-sm text-[13px] font-semibold shadow-[0_0_14px_rgba(124,58,237,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isAuditing ? "animate-spin" : ""}`}
              >
                {isAuditing ? "refresh" : "play_circle"}
              </span>
              <span>{isAuditing ? "Auditing Copy..." : "Run Audit"}</span>
              <span className="px-1.5 py-0.5 rounded bg-on-primary-container/20 text-on-primary-container font-mono text-[10px] font-normal">
                ⌘+Enter
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Taxonomy Pills & Live Metric Strip */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-outline-variant/20">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mr-1">Scope:</span>
            {["All Channels", "Marketing & Web", "Product UI Copy", "PR & Press", "Investor Comms"].map(
              (channel, idx) => (
                <button
                  key={channel}
                  type="button"
                  className={`px-space-md py-1 rounded-full font-label-md text-[11px] transition-colors ${
                    idx === 0
                      ? "bg-primary-container text-on-primary-container font-medium"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {channel}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-space-lg text-outline font-label-sm text-[11px] font-mono">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>Deterministic Regex</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span>pgvector RAG v0.8.7</span>
            </div>
            <div className="flex items-center gap-1 text-tertiary">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>Latency: {auditLatency ? `${auditLatency}ms` : "142ms"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Workbench (60% Editor / 40% Remediation Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        {/* LEFT PANE: Content Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm flex flex-col">
            {/* Editor Header & Toolbar */}
            <div className="bg-surface-container-lowest px-space-md py-space-sm flex flex-wrap items-center justify-between gap-space-sm border-b border-outline-variant/20">
              {/* Submission Title & Version */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-headline-sm text-[15px] text-on-surface font-semibold truncate max-w-sm">
                  {currentSubmission?.title || "Draft Content"}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px]">
                  v{currentSubmission?.current_version || 1}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-medium uppercase font-mono ${
                    currentSubmission?.status === "APPROVED"
                      ? "bg-tertiary-container/30 text-tertiary"
                      : currentSubmission?.status === "CHANGES_REQUESTED"
                      ? "bg-error-container/30 text-error"
                      : currentSubmission?.status === "NEEDS_REVIEW"
                      ? "bg-secondary-container/30 text-secondary-fixed"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {currentSubmission?.status || "DRAFT"}
                </span>
              </div>

              {/* Utility & Revision Actions */}
              <div className="flex items-center gap-space-xs">
                {editorContent !== originalContent && (
                  <button
                    onClick={() => setEditorContent(originalContent)}
                    type="button"
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-[12px] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">undo</span>
                    <span>Revert</span>
                  </button>
                )}

                <button
                  onClick={() => setShowRevisionModal(true)}
                  type="button"
                  className="flex items-center gap-1 px-space-sm py-1 rounded bg-primary-container text-on-primary-container hover:bg-primary-container/90 text-[12px] font-medium transition-colors shadow-sm"
                  title="Persist changes as a new revision in PostgreSQL"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  <span>Save Revision</span>
                </button>
              </div>
            </div>

            {/* Telemetry Metadata Bar */}
            <div className="bg-surface-container/60 px-space-md py-1.5 flex flex-wrap items-center justify-between gap-space-sm text-outline font-code-sm text-[11px] font-mono border-b border-outline-variant/20">
              <div className="flex items-center gap-space-md">
                <span className="flex items-center gap-1 text-on-surface font-medium">
                  <span className="material-symbols-outlined text-[14px] text-outline">description</span>
                  <span>{wordCount}</span> words
                </span>
                <span>·</span>
                <span>{charCount} chars</span>
                <span>·</span>
                <span className="text-on-surface-variant">
                  Format: {currentSubmission?.content_format || "TEXT"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="text-on-surface-variant font-label-sm text-[11px]">Database Synced</span>
              </div>
            </div>

            {/* Audio/video ingestion and playback */}
            <div className="px-space-md py-space-sm bg-surface-container-lowest border-b border-outline-variant/20 flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {isVideoSubmission ? "videocam" : "mic"}
                  </span>
                  <span className="text-[12px] text-on-surface-variant">
                    {isVideoSubmission || isAudioSubmission
                      ? "Replace media or re-run transcript governance"
                      : "Add an audio or video asset to audit its transcript"}
                  </span>
                </div>
                <label className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-[11px] text-on-surface cursor-pointer">
                  Choose media
                  <input
                    type="file"
                    accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.mp4,.mov,.webm,.m4v,.mkv,.avi"
                    className="hidden"
                    onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {mediaFile && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container border border-primary/30 text-[11px]">
                  <span className="truncate text-on-surface">{mediaFile.name}</span>
                  <button
                    type="button"
                    onClick={handleMediaUpload}
                    disabled={isUploadingMedia}
                    className="shrink-0 px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-semibold disabled:opacity-50"
                  >
                    {isUploadingMedia ? "Ingesting..." : "Ingest & Audit"}
                  </button>
                </div>
              )}

              {isAudioSubmission && latestMediaUrl && latestMediaUrl.startsWith("data:") && (
                <audio controls src={latestMediaUrl} className="w-full h-9" aria-label="Uploaded audio asset" />
              )}
              {isVideoSubmission && latestMediaUrl && latestMediaUrl.startsWith("data:") && (
                <video controls src={latestMediaUrl} className="w-full max-h-56 rounded-lg bg-black" aria-label="Uploaded video asset" />
              )}
              {(isAudioSubmission || isVideoSubmission) && latestMediaUrl && !latestMediaUrl.startsWith("data:") && (
                <div className="p-2 rounded-lg bg-surface-container text-[11px] text-outline">
                  Mock media reference: {latestMediaUrl}
                </div>
              )}
            </div>

            {/* Document Editor Surface */}
            <div className="p-space-lg bg-surface min-h-[500px] flex flex-col">
              <div className="text-outline font-mono text-[10px] uppercase tracking-wider mb-space-sm flex items-center justify-between">
                <span>SUBMISSION ID: #{currentSubmission?.id || "—"}</span>
                <span>CREATOR: {currentSubmission?.creator_name || "Alex Rivera"}</span>
              </div>

              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Enter or paste marketing copy, press releases, or documentation for brand governance audit..."
                className="w-full flex-1 min-h-[440px] bg-transparent text-on-surface font-sans text-[15px] leading-relaxed resize-y focus:outline-none border-0 placeholder:text-outline/60"
              />
            </div>

            {/* Editor Footer: Status Engine */}
            <div className="bg-surface-container-lowest px-space-md py-space-sm flex flex-wrap items-center justify-between gap-space-sm font-mono text-[11px] text-outline border-t border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                <span className="text-on-surface-variant">
                  Current Version:{" "}
                  <strong className="text-on-surface font-normal">v{currentSubmission?.current_version || 1}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">memory</span>
                <span>
                  Engine: <span className="text-secondary">Google Gemini 3.5 Flash & pgvector</span>
                </span>
              </div>

              {auditResult?.confidentiality_report && (
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="material-symbols-outlined text-[16px]">privacy_tip</span>
                  <span>PII Guard Active ({auditResult.confidentiality_report.total_redacted} scrubbed)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Audit Results & Remediation Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Panel Header & Compliance Score Card */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-mono">
                  Governing Health Index
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-headline-xl text-[28px] text-on-surface font-semibold tracking-tight font-mono">
                    {complianceScore != null ? `${complianceScore}%` : "Not Audited"}
                  </span>
                  {complianceScore != null && (
                    <span
                      className={`px-2 py-0.5 rounded font-label-md text-[11px] font-semibold ${
                        complianceScore >= 80
                          ? "bg-tertiary-container/40 text-tertiary"
                          : complianceScore >= 60
                          ? "bg-secondary-container/40 text-secondary-fixed"
                          : "bg-error-container/40 text-error"
                      }`}
                    >
                      {complianceScore >= 80
                        ? "Compliant"
                        : complianceScore >= 60
                        ? "Moderate Risk"
                        : "Policy Violation"}
                    </span>
                  )}
                </div>
              </div>

              {/* Circular Gauge Indicator */}
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className={
                      scoreVal >= 80 ? "text-tertiary" : scoreVal >= 60 ? "text-secondary" : "text-error"
                    }
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${scoreVal}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <span
                  className={`material-symbols-outlined absolute text-[20px] ${
                    scoreVal >= 80 ? "text-tertiary" : scoreVal >= 60 ? "text-secondary" : "text-error"
                  }`}
                >
                  {scoreVal >= 80 ? "verified" : scoreVal >= 60 ? "gpp_maybe" : "gpp_bad"}
                </span>
              </div>
            </div>

            {/* Issue Category Summary Counters */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                className={`p-2 rounded border transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
                  severityFilter === "CRITICAL"
                    ? "bg-error-container/30 border-error"
                    : "bg-surface-container border-outline-variant/20 hover:bg-surface-container-high"
                }`}
              >
                <span className="font-headline-sm text-[16px] text-error font-semibold font-mono">
                  {criticalCount}
                </span>
                <span className="font-label-sm text-[10px] text-outline uppercase font-mono">Critical</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "WARNING" ? "ALL" : "WARNING")}
                className={`p-2 rounded border transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
                  severityFilter === "WARNING"
                    ? "bg-secondary-container/30 border-secondary"
                    : "bg-surface-container border-outline-variant/20 hover:bg-surface-container-high"
                }`}
              >
                <span className="font-headline-sm text-[16px] text-secondary font-semibold font-mono">
                  {warningCount}
                </span>
                <span className="font-label-sm text-[10px] text-outline uppercase font-mono">Warnings</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityFilter(severityFilter === "SUGGESTION" ? "ALL" : "SUGGESTION")}
                className={`p-2 rounded border transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
                  severityFilter === "SUGGESTION"
                    ? "bg-primary-container/30 border-primary"
                    : "bg-surface-container border-outline-variant/20 hover:bg-surface-container-high"
                }`}
              >
                <span className="font-headline-sm text-[16px] text-primary font-semibold font-mono">
                  {suggestionCount}
                </span>
                <span className="font-label-sm text-[10px] text-outline uppercase font-mono">Suggestions</span>
              </button>
            </div>

            {/* Filter Tab Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter("ALL");
                  setResolutionFilter("ALL");
                }}
                className={`px-space-sm py-1 rounded font-medium shrink-0 transition-colors ${
                  severityFilter === "ALL" && resolutionFilter === "ALL"
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                All Issues ({allFindings.length})
              </button>
              <button
                type="button"
                onClick={() => setResolutionFilter(resolutionFilter === "OPEN" ? "ALL" : "OPEN")}
                className={`px-space-sm py-1 rounded font-medium shrink-0 transition-colors ${
                  resolutionFilter === "OPEN"
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Open Only ({openCount})
              </button>
            </div>
          </div>

          {/* Violation Cards Scrollable Stack */}
          <div className="flex flex-col gap-space-md max-h-[560px] overflow-y-auto pr-1">
            {filteredFindings.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-container-low border border-outline-variant/30 text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-[36px] mb-2">
                  verified_user
                </span>
                <p className="font-headline-sm text-[14px] text-on-surface font-semibold">
                  {allFindings.length === 0 ? "No Audit Findings Recorded" : "No Matching Findings"}
                </p>
                <p className="font-body-sm text-[12px] text-outline mt-1 max-w-xs">
                  {allFindings.length === 0
                    ? "Click 'Run Audit' above to evaluate this content against corporate guidelines."
                    : "Try adjusting your filter selection above."}
                </p>
              </div>
            ) : (
              filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className={`p-space-md rounded-xl bg-surface-container-low border transition-all flex flex-col gap-space-sm ${
                    finding.resolution_state === "OVERRIDDEN"
                      ? "border-secondary/40 opacity-75"
                      : finding.resolution_state === "RESOLVED"
                      ? "border-tertiary/40 opacity-75"
                      : finding.severity === "CRITICAL"
                      ? "border-error/40 shadow-sm"
                      : "border-outline-variant/30"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-space-sm flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-semibold tracking-wider uppercase font-mono ${
                          finding.severity === "CRITICAL"
                            ? "bg-error-container text-on-error-container"
                            : finding.severity === "WARNING"
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-primary-container text-on-primary-container"
                        }`}
                      >
                        {finding.severity} · {finding.category}
                      </span>

                      {finding.resolution_state !== "OPEN" && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-tertiary text-[10px] font-mono">
                          {finding.resolution_state}
                        </span>
                      )}
                    </div>

                    <span className="font-code-sm text-[10px] text-outline font-mono">
                      {finding.detector_source} · #{finding.id}
                    </span>
                  </div>

                  {/* Flagged Excerpt Snippet */}
                  <div className="p-space-sm rounded bg-surface-container-lowest font-code-sm text-[12px] text-error flex items-center justify-between border border-error/20 font-mono">
                    <span className="truncate pr-2">“{finding.flagged_excerpt}”</span>
                    <span className="material-symbols-outlined text-[16px] text-error shrink-0">cancel</span>
                  </div>

                  {/* Policy Explanation */}
                  <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                    {finding.explanation}
                  </p>

                  {/* Suggested Correction Box */}
                  {finding.suggested_correction && (
                    <div className="p-space-sm rounded bg-surface-container border border-tertiary/20 flex flex-col gap-1">
                      <span className="font-label-sm text-[10px] text-tertiary font-semibold uppercase flex items-center gap-1 font-mono">
                        <span className="material-symbols-outlined text-[14px]">auto_fix</span>
                        Compliant Replacement
                      </span>
                      <span className="font-body-sm text-[12px] text-on-surface font-medium font-mono">
                        “{finding.suggested_correction}”
                      </span>
                    </div>
                  )}

                  {/* Override justification if present */}
                  {finding.override_reason && (
                    <div className="p-space-sm rounded bg-surface-container-high border border-secondary/30 text-[11px]">
                      <span className="font-mono text-secondary font-semibold">Override Reason: </span>
                      <span className="text-on-surface-variant">{finding.override_reason}</span>
                      {finding.resolved_by && (
                        <span className="text-outline font-mono block mt-0.5">By {finding.resolved_by}</span>
                      )}
                    </div>
                  )}

                  {/* Action Cluster */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-space-xs border-t border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      {finding.suggested_correction && finding.resolution_state === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleApplyFix(finding)}
                          className="px-space-md py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-sm text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                        >
                          Apply Fix
                        </button>
                      )}

                      {finding.resolution_state === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleResolveFinding(finding.id)}
                          className="px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}
                    </div>

                    {/* Exemption / Override Request */}
                    {finding.resolution_state === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFinding(finding);
                          setOverrideReason("");
                          setOverrideError(null);
                        }}
                        className="text-outline hover:text-primary font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Request Exemption</span>
                        <span className="material-symbols-outlined text-[14px]">launch</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Remediation Panel Footer & Governance Hand-Off */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-space-sm flex-wrap">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-code-sm text-[12px] font-bold">
                  {currentRole.slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-[10px] text-outline uppercase font-mono">
                    Current Authority
                  </span>
                  <span className="font-body-sm text-[13px] text-on-surface font-medium truncate">
                    Alex Rivera ({currentRole})
                  </span>
                </div>
              </div>

              {/* Status Transition Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentSubmission?.status === "DRAFT" && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange("NEEDS_REVIEW", "Submitted by creator for review.")}
                    className="flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-[12px] font-semibold transition-colors border border-outline-variant/30 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-primary text-[16px]">forward_to_inbox</span>
                    <span>Submit for Review</span>
                  </button>
                )}

                {currentSubmission?.status === "NEEDS_REVIEW" && (
                  <>
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        handleStatusChange("CHANGES_REQUESTED", "Violations detected. Revisions requested.")
                      }
                      className="px-space-md py-1.5 rounded-lg bg-error-container/40 text-error hover:bg-error-container/60 font-headline-sm text-[12px] font-semibold transition-colors cursor-pointer"
                    >
                      Request Changes
                    </button>

                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusChange("APPROVED", "Executive review passed. Approved for release.")}
                      className="flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/90 font-headline-sm text-[12px] font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Approve</span>
                    </button>
                  </>
                )}

                {currentSubmission?.status === "CHANGES_REQUESTED" && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange("NEEDS_REVIEW", "Revised copy re-submitted for review.")}
                    className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    Re-Submit for Review
                  </button>
                )}

                {currentSubmission?.status === "APPROVED" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-tertiary/10 text-tertiary font-mono text-[11px] font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Approved for Publishing</span>
                  </span>
                )}
              </div>
            </div>

            {/* Workflow Trail & Comments Quick Bar */}
            <div className="flex items-center justify-between pt-space-xs text-outline font-label-sm text-[11px] font-mono border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
                className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Comments ({comments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWorkflowDrawer(!showWorkflowDrawer)}
                className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>Audit Trail ({workflowHistory.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OVERRIDE JUSTIFICATION MODAL */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">policy</span>
                <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                  Authorize Policy Override
                </span>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-outline hover:text-on-surface text-[18px]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-surface-container text-[12px] flex flex-col gap-1">
              <span className="text-outline uppercase font-mono text-[10px]">Flagged Excerpt:</span>
              <span className="font-mono text-error font-medium">“{selectedFinding.flagged_excerpt}”</span>
              <span className="text-on-surface-variant mt-1">{selectedFinding.explanation}</span>
            </div>

            {currentRole === "CREATOR" ? (
              <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-[12px]">
                <strong className="block font-semibold">Permission Restricted (CREATOR Role)</strong>
                Only users with REVIEWER or MANAGER authority may override brand governance policies. Switch
                roles in the top header to simulate authorized approval.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-[12px] text-on-surface-variant font-medium">
                  Enter Corporate Exemption / Justification Reason:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Approved executive launch exemption granted by CMO for Q4 campaign embargo."
                  className="w-full h-24 p-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>
            )}

            {overrideError && (
              <span className="text-error text-[12px] font-medium">{overrideError}</span>
            )}

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setSelectedFinding(null)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px] font-medium"
              >
                Cancel
              </button>
              {currentRole !== "CREATOR" && (
                <button
                  type="button"
                  disabled={isSubmittingOverride}
                  onClick={handleSubmitOverride}
                  className="px-4 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-[12px] font-semibold transition-all shadow-md"
                >
                  {isSubmittingOverride ? "Saving Override..." : "Confirm Override"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SAVE REVISION MODAL */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Save New Version Revision
              </span>
              <button onClick={() => setShowRevisionModal(false)} className="text-outline hover:text-on-surface text-[18px]">
                ✕
              </button>
            </div>

            <p className="text-[13px] text-on-surface-variant">
              This will increment the submission to version v{(currentSubmission?.current_version || 1) + 1} and
              reset the status to DRAFT so that fresh governance rules can be audited.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-on-surface-variant font-medium">Change Summary:</label>
              <input
                type="text"
                value={revisionSummary}
                onChange={(e) => setRevisionSummary(e.target.value)}
                placeholder="e.g. Fixed banned superlatives and replaced deprecated terminology."
                className="w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRevision}
                onClick={handleSaveRevision}
                className="px-4 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-[12px] font-semibold"
              >
                {isSavingRevision ? "Saving..." : "Commit Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUBMISSION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-low border border-outline-variant/40 rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_circle</span>
                <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                  Create Content Submission
                </span>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-outline hover:text-on-surface text-[18px]">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Asset Title:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Cloud Security Launch Press Release"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Content Format:</label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
                >
                  <option value="TEXT">Plain Text</option>
                  <option value="MARKDOWN">Markdown Document</option>
                  <option value="HTML">HTML Body</option>
                  <option value="AUDIO">Audio / Voiceover</option>
                  <option value="VIDEO">Video / Reel</option>
                </select>
              </div>

              {newFormat === "AUDIO" || newFormat === "VIDEO" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-on-surface-variant font-medium">
                    {newFormat === "AUDIO" ? "Audio file:" : "Video file:"}
                  </label>
                  <input
                    type="file"
                    accept={newFormat === "AUDIO" ? "audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" : "video/*,.mp4,.mov,.webm,.m4v,.mkv,.avi"}
                    onChange={(e) => setNewMediaFile(e.target.files?.[0] || null)}
                    className="w-full p-2 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 file:mr-3 file:rounded file:border-0 file:bg-primary-container file:px-2 file:py-1 file:text-on-primary-container"
                  />
                  <span className="text-[10px] text-outline">
                    The asset will be transcribed, checked against Blinkit guidelines, and added to the review queue.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-on-surface-variant font-medium">Initial Content Copy:</label>
                  <textarea
                    value={newInitialContent}
                    onChange={(e) => setNewInitialContent(e.target.value)}
                    placeholder="Enter initial copy draft to be governed..."
                    className="w-full h-32 p-3 rounded-lg bg-surface-container text-on-surface text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isCreatingSubmission ||
                  !newTitle.trim() ||
                  (newFormat === "AUDIO" || newFormat === "VIDEO" ? !newMediaFile : !newInitialContent.trim())
                }
                onClick={handleCreateSubmission}
                className="px-4 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-[12px] font-semibold disabled:opacity-50"
              >
                {isCreatingSubmission ? "Creating..." : "Create Submission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENTS & DISCUSSION DRAWER */}
      {showCommentsDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-container-low border-l border-outline-variant/40 shadow-2xl p-space-lg flex flex-col justify-between">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
                <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                  Reviewer Comments
                </span>
              </div>
              <button
                onClick={() => setShowCommentsDrawer(false)}
                className="text-outline hover:text-on-surface text-[18px]"
              >
                ✕
              </button>
            </div>

            {/* Comments List */}
            <div className="flex flex-col gap-space-sm max-h-[60vh] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="py-8 text-center text-outline text-[12px]">
                  No review comments yet on this submission.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1 text-[12px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-on-surface">{c.author_name}</span>
                      <span className="font-mono text-[10px] text-primary">{c.author_role}</span>
                    </div>
                    <p className="text-on-surface-variant">{c.comment_text}</p>
                    <span className="font-mono text-[10px] text-outline">
                      {new Date(c.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Comment Input */}
          <div className="pt-space-md border-t border-outline-variant/20 flex flex-col gap-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Leave a review comment or guidance..."
              className="w-full h-20 p-2.5 rounded-lg bg-surface-container text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
            <button
              type="button"
              disabled={isPostingComment || !newCommentText.trim()}
              onClick={handlePostComment}
              className="self-end px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-[12px] disabled:opacity-50"
            >
              {isPostingComment ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      )}

      {/* WORKFLOW AUDIT TRAIL DRAWER */}
      {showWorkflowDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-container-low border-l border-outline-variant/40 shadow-2xl p-space-lg flex flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm mb-space-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">history</span>
              <span className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Immutable Governance Trail
              </span>
            </div>
            <button
              onClick={() => setShowWorkflowDrawer(false)}
              className="text-outline hover:text-on-surface text-[18px]"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-space-sm overflow-y-auto flex-1 pr-1 font-mono text-[11px]">
            {workflowHistory.length === 0 ? (
              <div className="py-8 text-center text-outline text-[12px]">
                No workflow events recorded yet.
              </div>
            ) : (
              workflowHistory.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{w.event_type}</span>
                    <span className="text-outline text-[10px]">
                      {new Date(w.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-on-surface-variant">
                    Actor: {w.actor_name} ({w.actor_role})
                  </div>
                  {(w.from_status || w.to_status) && (
                    <div className="text-secondary">
                      Transition: {w.from_status || "—"} → {w.to_status}
                    </div>
                  )}
                  {w.notes && <div className="text-outline font-sans italic">{w.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentAuditWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
              refresh
            </span>
            <span className="text-[14px] text-outline font-mono">Loading Content Audit Workspace...</span>
          </div>
        </div>
      }
    >
      <AuditWorkspaceContent />
    </Suspense>
  );
}
