import pytest
from app.core.database import Base
import app.models
from app.models.brand import BrandProfile
from app.models.guideline_chunk import GuidelineChunk
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.workflow import WorkflowEvent, ReviewComment


def test_expected_tables_registered():
    """Verify that all required governance tables are registered in DeclarativeBase metadata."""
    expected_tables = {
        "brand_profiles",
        "campaigns",
        "rulesets",
        "guideline_chunks",
        "submissions",
        "submission_revisions",
        "audit_findings",
        "workflow_events",
        "review_comments",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"
    assert len(expected_tables) == 9


def test_brand_profile_model_attributes():
    """Verifies BrandProfile declarative columns and default values on the Table schema."""
    table = BrandProfile.__table__
    assert table.c.name.unique is True
    assert table.c.min_wcag_contrast.default.arg == 4.5
    assert table.c.approved_hex_palette.default.arg is not None
    assert table.c.banned_terms.default.arg is not None
    assert table.c.preferred_terminology.default.arg is not None


def test_submission_model_defaults():
    """Verifies Submission table defaults: DRAFT status, version 1, format TEXT."""
    table = Submission.__table__
    assert table.c.status.default.arg == "DRAFT"
    assert table.c.current_version.default.arg == 1
    assert table.c.content_format.default.arg == "TEXT"
    assert table.c.compliance_score.nullable is True


def test_guideline_chunk_counters():
    """Verifies GuidelineChunk governance tracking counters default to 0."""
    table = GuidelineChunk.__table__
    assert table.c.times_triggered.default.arg == 0
    assert table.c.times_overridden.default.arg == 0
    assert table.c.content_text.nullable is False
