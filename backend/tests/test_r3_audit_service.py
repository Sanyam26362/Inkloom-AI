import pytest
from app.services.audit_service import AuditService, _norm_ws
from app.services.rule_engine import FindingDraft


def test_norm_ws_collapses_and_nfkc():
    assert _norm_ws("  Hello\t\u00A0WORLD \n") == "hello world"
    assert _norm_ws(None) == ""


def test_normalize_ai_finding_coercion():
    # Coerces unknown/None category and severity
    raw = {"category": None, "severity": None, "flagged_excerpt": "test copy"}
    norm = AuditService.normalize_ai_finding(raw, source_text="test copy here", retrieved_ids=set())
    assert norm is not None
    assert norm["category"] == "TONE"
    assert norm["severity"] == "WARNING"

    raw_unknown = {"category": "RANDOM_UNKNOWN", "severity": "EXTREME", "flagged_excerpt": "test copy"}
    norm_unk = AuditService.normalize_ai_finding(raw_unknown, source_text="test copy here", retrieved_ids=set())
    assert norm_unk is not None
    assert norm_unk["category"] == "TONE"
    assert norm_unk["severity"] == "WARNING"


def test_normalize_ai_finding_drops_supported_and_not_a_claim():
    raw_supported = {"category": "FACTUAL_CLAIM", "severity": "WARNING", "flagged_excerpt": "fact", "claim_status": "SUPPORTED"}
    assert AuditService.normalize_ai_finding(raw_supported, source_text="fact", retrieved_ids=set()) is None

    raw_not_claim = {"category": "TONE", "severity": "SUGGESTION", "flagged_excerpt": "hey", "claim_status": "NOT_A_CLAIM"}
    assert AuditService.normalize_ai_finding(raw_not_claim, source_text="hey", retrieved_ids=set()) is None


def test_normalize_ai_finding_ungrounded_downgraded():
    raw = {
        "category": "TONE",
        "severity": "CRITICAL",
        "flagged_excerpt": "absent excerpt",
        "explanation": "Offensive tone",
    }
    norm = AuditService.normalize_ai_finding(raw, source_text="different text completely", retrieved_ids=set())
    assert norm is not None
    assert norm["severity"] == "SUGGESTION"
    assert norm["explanation"].startswith("[Unverified: excerpt not found verbatim in submission]")


def test_normalize_ai_finding_uncited_critical_capped():
    # Uncited CRITICAL without CONTRADICTED gets capped to WARNING
    raw = {
        "category": "TONE",
        "severity": "CRITICAL",
        "flagged_excerpt": "verbatim text",
        "cited_guideline_id": 999,
        "claim_status": "UNSUPPORTED",
    }
    norm = AuditService.normalize_ai_finding(raw, source_text="verbatim text in body", retrieved_ids={1, 2})
    assert norm is not None
    assert norm["cited_guideline_id"] is None
    assert norm["severity"] == "WARNING"


def test_normalize_ai_finding_contradicted_stays_critical():
    # CONTRADICTED stays CRITICAL even if cited_guideline_id not in retrieved_ids
    raw = {
        "category": "FACTUAL_CLAIM",
        "severity": "CRITICAL",
        "flagged_excerpt": "impossible SLA",
        "cited_guideline_id": 999,
        "claim_status": "CONTRADICTED",
    }
    norm = AuditService.normalize_ai_finding(raw, source_text="impossible SLA claim", retrieved_ids={1, 2})
    assert norm is not None
    assert norm["cited_guideline_id"] is None
    assert norm["severity"] == "CRITICAL"


def test_dedupe_findings_removes_exact_and_overlapping_rag_llm():
    deterministic = FindingDraft(
        category="TERMINOLOGY",
        severity="CRITICAL",
        detector_source="DETERMINISTIC_RULE",
        flagged_excerpt="instant delivery",
        explanation="Banned term",
        guideline_citation="Rulebook",
        suggested_correction="10-minute delivery",
    )
    rag_llm_overlapping = FindingDraft(
        category="TERMINOLOGY",
        severity="WARNING",
        detector_source="RAG_LLM",
        flagged_excerpt="get instant delivery now",
        explanation="LLM repeated issue",
        guideline_citation="Rulebook",
        suggested_correction="10-minute delivery",
    )
    rag_llm_independent = FindingDraft(
        category="TONE",
        severity="WARNING",
        detector_source="RAG_LLM",
        flagged_excerpt="arrogant headline",
        explanation="Overly hyped tone",
        guideline_citation="Voice Guide",
        suggested_correction="Empathetic headline",
    )

    deduped = AuditService.dedupe_findings([deterministic, rag_llm_overlapping, rag_llm_independent])
    # The overlapping RAG_LLM finding must be dropped
    assert len(deduped) == 2
    sources = [f.detector_source for f in deduped]
    assert "DETERMINISTIC_RULE" in sources
    assert "RAG_LLM" in sources
    assert deduped[1].flagged_excerpt == "arrogant headline"


def test_system_finding_gives_needs_review_and_own_dimension():
    system_finding = FindingDraft(
        category="SYSTEM",
        severity="WARNING",
        detector_source="AI_GOVERNANCE_ENGINE",
        flagged_excerpt="Guideline retrieval degraded",
        explanation="Fallback mode active",
        guideline_citation="System Reliability Guardrail",
        suggested_correction="Reindex guidelines",
    )
    verdict, dims = AuditService.evaluate_verdict_and_dimensions(findings=[system_finding], ai_status="ok")
    assert verdict == "NEEDS_REVIEW"
    assert "system_integrity" in dims
    assert dims["system_integrity"]["warning_findings"] == 1
    assert dims["system_integrity"]["status"] == "NEEDS_REVIEW"


def test_partial_ai_status_never_passes():
    # Even with zero findings, partial ai_status must yield NEEDS_REVIEW, never PASS
    verdict, _ = AuditService.evaluate_verdict_and_dimensions(findings=[], ai_status="partial")
    assert verdict == "NEEDS_REVIEW"


def test_verify_and_filter_findings_grounding_and_redaction_token():
    scrubbed = "Contact [REDACTED_EMAIL_1] for queries and visit our store."
    raw_findings = [
        # Grounded verbatim finding
        {
            "category": "TERMINOLOGY",
            "severity": "WARNING",
            "flagged_excerpt": "our store",
            "explanation": "Use dark store",
            "suggested_correction": "our dark store",
        },
        # Finding quoting the scrubbed token - must NOT be dropped as hallucinated
        {
            "category": "TONE",
            "severity": "WARNING",
            "flagged_excerpt": "[REDACTED_EMAIL_1]",
            "explanation": "Direct email disclosure in public copy",
            "suggested_correction": "support portal",
        },
        # Completely hallucinated finding
        {
            "category": "FACTUAL_CLAIM",
            "severity": "CRITICAL",
            "flagged_excerpt": "completely fabricated statement about bankruptcy",
            "explanation": "Hallucinated claim",
            "suggested_correction": "None",
        },
    ]

    restore_map = {"[REDACTED_EMAIL_1]": "priya@example.com"}
    results = AuditService.verify_and_filter_findings(
        raw_findings=raw_findings,
        source_text=scrubbed,
        retrieved_map={},
        restore_map=restore_map,
    )

    # Hallucinated one dropped; grounded and token findings kept
    assert len(results) == 2
    excerpts = [f.flagged_excerpt for f in results]
    assert "our store" in excerpts
    assert "priya@example.com" in excerpts

