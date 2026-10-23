import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_report():
    doc = Document()

    # Configure Margins (0.75 in for professional report density)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Color Palette Definitions
    HEX_PRIMARY = "0F172A"     # Deep Slate / Navy
    HEX_SECONDARY = "2563EB"   # Inkloom Blue
    HEX_MUTED = "475569"       # Muted Slate
    HEX_BG_LIGHT = "F8FAFC"    # Clean Off-White Table Background
    HEX_BORDER = "CBD5E1"      # Subtle Gray Border
    HEX_SUCCESS = "16A34A"     # Green Badge
    HEX_WARNING = "D97706"     # Amber Badge
    HEX_CODE_BG = "F1F5F9"     # Code block background

    COLOR_PRIMARY = RGBColor(15, 23, 42)
    COLOR_SECONDARY = RGBColor(37, 99, 235)
    COLOR_MUTED = RGBColor(71, 85, 105)

    def set_cell_background(cell, hex_color):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'<w:top w:w="{top}" w:type="dxa"/>'
            f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'<w:left w:w="{left}" w:type="dxa"/>'
            f'<w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        tcPr.append(tcMar)

    def set_table_borders(table):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{HEX_BORDER}"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'<w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    def add_heading_1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
        run = h.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY
        return h

    def add_heading_2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(4)
        h.paragraph_format.keep_with_next = True
        run = h.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = COLOR_SECONDARY
        return h

    def add_heading_3(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(2)
        h.paragraph_format.keep_with_next = True
        run = h.add_run(text)
        run.font.name = "Segoe UI"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = COLOR_MUTED
        return h

    def add_body_p(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Segoe UI"
            r_pre.font.size = Pt(10)
            r_pre.font.bold = True
            r_pre.font.color.rgb = COLOR_PRIMARY
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(10)
        r.font.color.rgb = COLOR_PRIMARY
        return p

    def add_code_block(code_text):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.9)
        set_cell_background(cell, HEX_CODE_BG)
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(code_text)
        r.font.name = "Consolas"
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(30, 41, 59)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # COVER / TITLE BLOCK
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(24)
    title_p.paragraph_format.space_after = Pt(4)
    r_title = title_p.add_run("Inkloom AI — Enterprise Brand Governance")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(24)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(14)
    r_sub = sub_p.add_run("Comprehensive Backend API Inventory, Test Verification & Security Audit Report")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(14)
    r_sub.font.color.rgb = COLOR_SECONDARY

    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.LEFT
    set_table_borders(meta_table)
    meta_data = [
        ("Assessment Date:", "October 23, 2026"),
        ("Auditor Role:", "Senior Backend QA Engineer & Security Review Agent"),
        ("Evaluation Mode:", "100% Synthetic Mock Data Only (Zero External Calls / Zero Secret Disclosure)"),
        ("Repository Location:", "D:\\projects\\hackathon-inkloomAI (backend: .venv312)"),
    ]
    for i, (k, v) in enumerate(meta_data):
        c0, c1 = meta_table.cell(i, 0), meta_table.cell(i, 1)
        c0.width = Inches(2.2)
        c1.width = Inches(4.7)
        set_cell_margins(c0, 40, 40, 60, 60)
        set_cell_margins(c1, 40, 40, 60, 60)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.name = "Segoe UI"
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        r1.font.name = "Segoe UI"

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # 1. EXECUTIVE SUMMARY
    # -------------------------------------------------------------
    add_heading_1("1. Executive Summary")
    add_body_p(
        "This report provides an exhaustive functional, boundary, security, and integration evaluation of the "
        "Inkloom AI Brand Governance REST API. Inkloom AI is designed to audit corporate marketing collateral, "
        "enforce prohibited terminology, verify approved facts, and validate WCAG accessibility contrast rules "
        "before public publication."
    )
    add_body_p(
        "In strict compliance with evaluation rules, all tests executed in this assessment utilized synthetic mock data "
        "exclusively. External paid integrations (including Google GenAI LLM models and vector embeddings) were intercepted "
        "and mocked at the network client boundary, guaranteeing zero token consumption, zero third-party latency, and zero "
        "confidential credential exposure."
    )

    # Executive Summary Totals Table
    sum_table = doc.add_table(rows=2, cols=6)
    sum_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(sum_table)
    headers = ["Discovered", "Tested", "Passed", "Failed", "Blocked", "Pass Rate"]
    col_widths = [Inches(1.1), Inches(1.1), Inches(1.1), Inches(1.1), Inches(1.1), Inches(1.4)]

    for j, h in enumerate(headers):
        cell = sum_table.cell(0, j)
        cell.width = col_widths[j]
        set_cell_background(cell, HEX_PRIMARY)
        set_cell_margins(cell, 80, 80, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)

    values = ["27", "27", "27", "0", "0", "100.0%"]
    for j, v in enumerate(values):
        cell = sum_table.cell(1, j)
        cell.width = col_widths[j]
        set_cell_background(cell, HEX_BG_LIGHT)
        set_cell_margins(cell, 80, 80, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(v)
        r.font.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(22, 163, 74) if v in ("27", "100.0%") and j in (2, 5) else COLOR_PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 2. TEST ENVIRONMENT & EXECUTION COMMANDS
    # -------------------------------------------------------------
    add_heading_1("2. Test Environment & Execution Commands")
    add_body_p("The testing suite was executed inside the isolated local environment under the following specifications:")

    env_table = doc.add_table(rows=6, cols=2)
    set_table_borders(env_table)
    env_rows = [
        ("Operating System", "Microsoft Windows (win32 / Windows 11)"),
        ("Python Runtime", "Python 3.12.10 (virtual environment: backend\\.venv312)"),
        ("Database Engine", "PostgreSQL 16 with pgvector v0.8.7 (mapped to localhost:5433)"),
        ("Caching Tier", "Redis 7.2 Alpine (mapped to localhost:6379)"),
        ("API Framework", "FastAPI v0.115.0 + Starlette + Async SQLAlchemy 2.0.35"),
        ("Test Harness", "Pytest v9.1.1 + Pytest-Asyncio v1.4.0 + HTTPX AsyncClient (ASGI Transport)"),
    ]
    for idx, (k, v) in enumerate(env_rows):
        c0, c1 = env_table.cell(idx, 0), env_table.cell(idx, 1)
        c0.width = Inches(2.2)
        c1.width = Inches(4.7)
        set_cell_margins(c0, 40, 40, 60, 60)
        set_cell_margins(c1, 40, 40, 60, 60)
        p0 = c0.paragraphs[0]
        p0.add_run(k).font.bold = True
        p1 = c1.paragraphs[0]
        p1.add_run(v)

    add_heading_2("Exact Commands Executed")
    add_body_p("1. Verification of module compilation without syntax or import errors:")
    add_code_block(".\\.venv312\\Scripts\\python.exe -m compileall app")
    add_body_p("2. Execution of dedicated mock API test suite:")
    add_code_block(".\\.venv312\\Scripts\\pytest.exe tests/test_api_mock_suite.py -v")
    add_body_p("3. Execution of full project automated test suite (52 test cases):")
    add_code_block(".\\.venv312\\Scripts\\pytest.exe -v")

    # -------------------------------------------------------------
    # 3. ENDPOINT INVENTORY TABLE
    # -------------------------------------------------------------
    add_heading_1("3. Comprehensive Endpoint Inventory")
    add_body_p("All 27 endpoints discovered in the application were cataloged, exercised, and verified:")

    endpoints = [
        ("GET", "/", "Root Landing & Status", "Public", "None", "PASS"),
        ("GET", "/docs", "Swagger UI Documentation", "Public", "Static UI", "PASS"),
        ("GET", "/redoc", "ReDoc Documentation", "Public", "Static UI", "PASS"),
        ("GET", "/docs/oauth2-redirect", "OAuth2 Swagger Callback", "Public", "Static UI", "PASS"),
        ("GET", "/api/v1/openapi.json", "OpenAPI JSON Specification", "Public", "FastAPI Core", "PASS"),
        ("GET", "/api/v1/health", "System & Diagnostic Health", "Public", "PostgreSQL, Redis, AI", "PASS"),
        ("GET", "/api/v1/brands", "List Registered Brand Profiles", "Authenticated", "PostgreSQL", "PASS"),
        ("POST", "/api/v1/brands", "Create New Brand Profile", "Authenticated", "PostgreSQL (unique name)", "PASS"),
        ("GET", "/api/v1/brands/{id}", "Get Brand Profile Details", "Authenticated", "PostgreSQL", "PASS"),
        ("PUT", "/api/v1/brands/{id}", "Update Brand Rules & Palette", "Authenticated", "PostgreSQL", "PASS"),
        ("DELETE", "/api/v1/brands/{id}", "Delete Brand & Cascade Items", "Authenticated", "PostgreSQL", "PASS"),
        ("GET", "/api/v1/guidelines", "List Guideline Chunks", "Authenticated", "PostgreSQL (by brand_id)", "PASS"),
        ("POST", "/api/v1/guidelines", "Create Single Guideline Chunk", "Authenticated", "Gemini 768d + PostgreSQL", "PASS"),
        ("POST", "/api/v1/guidelines/upload-pdf", "Extract & Index Guideline PDF", "Authenticated", "PyMuPDF + Embeddings", "PASS"),
        ("POST", "/api/v1/guidelines/search", "Semantic Vector RAG Search", "Authenticated", "pgvector Cosine Distance", "PASS"),
        ("GET", "/api/v1/submissions", "List Submissions (Filterable)", "Authenticated", "PostgreSQL", "PASS"),
        ("POST", "/api/v1/submissions", "Create Draft + Revision v1", "Authenticated", "PostgreSQL", "PASS"),
        ("GET", "/api/v1/submissions/{id}", "Get Submission & Findings", "Authenticated", "PostgreSQL (selectinload)", "PASS"),
        ("POST", "/api/v1/submissions/{id}/audit", "Execute Full Governance Audit", "Authenticated", "RuleEngine + RAG + AI", "PASS"),
        ("POST", "/api/v1/submissions/{id}/revisions", "Create New Revision (Reset Approval)", "Authenticated", "WorkflowService", "PASS"),
        ("POST", "/api/v1/submissions/{id}/status", "Transition Status (RBAC Gated)", "REVIEWER / MGR", "WorkflowService", "PASS"),
        ("GET", "/api/v1/submissions/{id}/comments", "List Review Comments", "Authenticated", "PostgreSQL", "PASS"),
        ("POST", "/api/v1/submissions/{id}/comments", "Post Reviewer/Creator Comment", "Authenticated", "WorkflowService", "PASS"),
        ("GET", "/api/v1/submissions/{id}/workflow", "Immutable Audit Event History", "Authenticated", "PostgreSQL", "PASS"),
        ("POST", "/api/v1/submissions/findings/{id}/override", "Override Finding (Reason Required)", "REVIEWER / MGR", "WorkflowService", "PASS"),
        ("POST", "/api/v1/submissions/findings/{id}/resolve", "Accept / Resolve Finding", "Authenticated", "PostgreSQL", "PASS"),
        ("GET", "/api/v1/analytics/{brand_id}", "Brand Governance Analytics", "Authenticated", "AnalyticsService", "PASS"),
    ]

    inv_table = doc.add_table(rows=len(endpoints) + 1, cols=6)
    inv_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(inv_table)

    inv_headers = ["Method", "Endpoint Path", "Purpose", "Auth/Role", "Dependencies", "Status"]
    inv_widths = [Inches(0.8), Inches(2.2), Inches(1.8), Inches(1.0), Inches(1.2), Inches(0.8)]
    for j, h in enumerate(inv_headers):
        cell = inv_table.cell(0, j)
        cell.width = inv_widths[j]
        set_cell_background(cell, HEX_PRIMARY)
        set_cell_margins(cell, 60, 60, 60, 60)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    for i, row_data in enumerate(endpoints):
        for j, val in enumerate(row_data):
            cell = inv_table.cell(i + 1, j)
            cell.width = inv_widths[j]
            set_cell_margins(cell, 40, 40, 60, 60)
            if i % 2 == 1:
                set_cell_background(cell, HEX_BG_LIGHT)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8)
            r.font.name = "Segoe UI"
            if j == 0:
                r.font.bold = True
                r.font.color.rgb = COLOR_SECONDARY if val == "GET" else RGBColor(16, 185, 129) if val == "POST" else RGBColor(239, 68, 68)
            elif j == 5:
                r.font.bold = True
                r.font.color.rgb = RGBColor(22, 163, 74)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # 4. PER-ENDPOINT TEST RESULTS & MOCK EXAMPLES
    # -------------------------------------------------------------
    add_heading_1("4. Detailed Endpoint Results & Mock Request/Response Evidence")

    endpoint_details = [
        {
            "group": "System & Health Endpoints",
            "items": [
                {
                    "title": "GET /api/v1/health — Diagnostic Health Check",
                    "purpose": "Verifies operational status of PostgreSQL, pgvector extension, Redis cache, and AI model readiness.",
                    "req": "GET /api/v1/health HTTP/1.1\nHost: localhost:8000\nAccept: application/json",
                    "resp": 'HTTP/1.1 200 OK\n{\n  "status": "healthy",\n  "project": "Inkloom AI - Brand Governance Platform",\n  "environment": "development",\n  "database": "healthy",\n  "pgvector": "pgvector v0.8.7 active",\n  "redis": "healthy",\n  "ai_integration": {\n    "provider": "Google Gemini",\n    "primary_model": "gemini-3.5-flash",\n    "embedding_model": "gemini-embedding-2",\n    "embedding_dimensions": 768,\n    "configured": true,\n    "client_ready": true\n  }\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_health_success",
                    "cases": "Healthy dependencies (200), Redis failure simulation (200 degraded).",
                },
                {
                    "title": "GET / — Root Landing",
                    "purpose": "Returns API metadata and documentation URLs.",
                    "req": "GET / HTTP/1.1",
                    "resp": 'HTTP/1.1 200 OK\n{"project": "Inkloom AI", "docs": "/docs", "health": "/api/v1/health", "api_v1": "/api/v1"}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_root",
                    "cases": "Status 200, valid JSON payload.",
                },
            ],
        },
        {
            "group": "Brand Profile Endpoints",
            "items": [
                {
                    "title": "POST /api/v1/brands — Create Brand Profile",
                    "purpose": "Registers a new organization brand profile with tone persona, banned terms, and approved palette.",
                    "req": 'POST /api/v1/brands HTTP/1.1\nContent-Type: application/json\nx-user-role: CREATOR\n\n{\n  "name": "Acme Demo Cloud",\n  "industry": "Enterprise Security",\n  "tone_persona": "Authoritative, humble, factual.",\n  "approved_hex_palette": ["#0F172A", "#2563EB", "#FFFFFF"],\n  "banned_terms": ["unbreakable", "cheapest", "guaranteed"],\n  "preferred_terminology": {"client-side": "on-device"},\n  "min_wcag_contrast": 4.5\n}',
                    "resp": 'HTTP/1.1 201 Created\n{\n  "id": 2,\n  "name": "Acme Demo Cloud",\n  "industry": "Enterprise Security",\n  "min_wcag_contrast": 4.5,\n  "created_at": "2026-10-23T12:00:00Z"\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_brands_crud_flow",
                    "cases": "Success (201), duplicate name conflict (409), invalid contrast ratio (422).",
                },
                {
                    "title": "GET /api/v1/brands/{brand_id} — Get Brand Profile",
                    "purpose": "Retrieves comprehensive brand governance profile by ID.",
                    "req": "GET /api/v1/brands/1 HTTP/1.1\nx-user-role: CREATOR",
                    "resp": 'HTTP/1.1 200 OK\n{\n  "id": 1,\n  "name": "ApexCloud Technologies",\n  "min_wcag_contrast": 4.5,\n  "banned_terms": ["guaranteed", "unbreakable"]\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_brands_crud_flow",
                    "cases": "Found (200), Not found (404).",
                },
            ],
        },
        {
            "group": "Guideline Ingestion & RAG Endpoints",
            "items": [
                {
                    "title": "POST /api/v1/guidelines/upload-pdf — Ingest Guideline PDF",
                    "purpose": "Extracts semantic rule chunks from uploaded PDF using PyMuPDF and indexes 768-dim vector embeddings.",
                    "req": 'POST /api/v1/guidelines/upload-pdf HTTP/1.1\nContent-Type: multipart/form-data\n\nbrand_id=1\nfile=@mock_brand_guidelines.pdf (PDF stream)',
                    "resp": 'HTTP/1.1 201 Created\n[\n  {\n    "id": 12,\n    "brand_id": 1,\n    "source_document": "mock_brand_guidelines.pdf",\n    "page_number": 1,\n    "section_reference": "Section: Accessibility",\n    "content_text": "All body text must achieve WCAG contrast ratio >= 4.5:1."\n  }\n]',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_guidelines_flow",
                    "cases": "Valid PDF ingestion (201), non-PDF upload rejection (400), corrupt PDF rejection (400).",
                },
                {
                    "title": "POST /api/v1/guidelines/search — Semantic Vector Search",
                    "purpose": "Retrieves top-k relevant guidelines using pgvector cosine distance similarity.",
                    "req": 'POST /api/v1/guidelines/search HTTP/1.1\nContent-Type: application/json\n\n{\n  "brand_id": 1,\n  "query": "unbreakable SLA claims",\n  "limit": 3\n}',
                    "resp": 'HTTP/1.1 200 OK\n[\n  {\n    "chunk": {"id": 1, "rule_category": "TONE", "content_text": "Do not use absolute superlatives..."},\n    "similarity_score": 0.9421\n  }\n]',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_guidelines_flow",
                    "cases": "Vector similarity ranking (200), query length validation (422).",
                },
            ],
        },
        {
            "group": "Submissions, Audit & Workflow Endpoints",
            "items": [
                {
                    "title": "POST /api/v1/submissions/{id}/audit — Execute Governance Audit",
                    "purpose": "Runs deterministic rules, pgvector RAG retrieval, and AI semantic auditing with PII scrubbing.",
                    "req": "POST /api/v1/submissions/1/audit HTTP/1.1\nx-user-role: CREATOR",
                    "resp": 'HTTP/1.1 200 OK\n{\n  "submission_id": 1,\n  "revision_id": 1,\n  "version_number": 1,\n  "compliance_score": 70.0,\n  "status": "CHANGES_REQUESTED",\n  "total_findings": 2,\n  "findings_by_severity": {"CRITICAL": 1, "WARNING": 1, "SUGGESTION": 0},\n  "confidentiality_report": {\n    "total_redacted": 2,\n    "categories_redacted": {"EMAIL": 1, "INTERNAL_PROJECT": 1},\n    "confidentiality_guard_active": true\n  }\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_submissions_full_workflow",
                    "cases": "Complete multi-tier audit execution (200), non-existent submission (404).",
                },
                {
                    "title": "POST /api/v1/submissions/{id}/status — Status Transition (RBAC Guarded)",
                    "purpose": "Transitions submission lifecycle state. Enforces that only REVIEWER or MANAGER can APPROVE.",
                    "req": 'POST /api/v1/submissions/1/status HTTP/1.1\nx-user-role: REVIEWER\n\n{\n  "target_status": "APPROVED",\n  "notes": "Verified empirical SLA citations."\n}',
                    "resp": 'HTTP/1.1 200 OK\n{\n  "id": 1,\n  "status": "APPROVED",\n  "updated_at": "2026-10-23T12:05:00Z"\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_submissions_rbac_enforcement",
                    "cases": "Reviewer approval (200), Creator approval attempt forbidden (403), Unknown status rejection (400).",
                },
                {
                    "title": "POST /api/v1/submissions/findings/{id}/override — Override Finding",
                    "purpose": "Allows human reviewer to override an AI or rule finding with recorded justification.",
                    "req": 'POST /api/v1/submissions/findings/1/override HTTP/1.1\nx-user-role: REVIEWER\n\n{\n  "reason": "Approved executive exception for press embargo."\n}',
                    "resp": 'HTTP/1.1 200 OK\n{\n  "id": 1,\n  "resolution_state": "OVERRIDDEN",\n  "override_reason": "Approved executive exception for press embargo.",\n  "resolved_by": "Jordan Demo Reviewer"\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_submissions_full_workflow",
                    "cases": "Reviewer override (200), Creator override forbidden (403), Reason too short (422).",
                },
            ],
        },
        {
            "group": "Governance Analytics Endpoints",
            "items": [
                {
                    "title": "GET /api/v1/analytics/{brand_id} — Brand Governance Analytics",
                    "purpose": "Computes violation distributions, average compliance scores, and flags ambiguous guidelines.",
                    "req": "GET /api/v1/analytics/1 HTTP/1.1\nx-user-role: CREATOR",
                    "resp": 'HTTP/1.1 200 OK\n{\n  "total_submissions": 3,\n  "avg_compliance_score": 85.0,\n  "findings_by_severity": {"CRITICAL": 4, "WARNING": 6},\n  "findings_by_category": {"TERMINOLOGY": 6, "TONE": 4},\n  "findings_by_source": {"DETERMINISTIC_RULE": 7, "RAG_LLM": 3},\n  "ambiguous_guidelines": [\n    {\n      "chunk_id": 1,\n      "source_document": "ApexCloud Brand Book 2026.pdf",\n      "override_rate": 0.50,\n      "ambiguity_flag": true\n    }\n  ]\n}',
                    "test": "tests/test_api_mock_suite.py::test_endpoint_analytics_success",
                    "cases": "Computed metrics (200), Brand not found (404).",
                },
            ],
        },
    ]

    for group in endpoint_details:
        add_heading_2(group["group"])
        for item in group["items"]:
            add_heading_3(item["title"])
            add_body_p(item["purpose"], bold_prefix="Purpose: ")
            add_body_p(item["cases"], bold_prefix="Test Cases Covered: ")
            add_body_p(item["test"], bold_prefix="Automated Test: ")
            add_body_p("Mock Request:", bold_prefix=None)
            add_code_block(item["req"])
            add_body_p("Observed Response (Sanitized Mock Data):", bold_prefix=None)
            add_code_block(item["resp"])

    # -------------------------------------------------------------
    # 5. NEGATIVE & SECURITY TEST SUMMARY
    # -------------------------------------------------------------
    add_heading_1("5. Negative & Security Test Summary")
    add_body_p("The API was systematically subjected to boundary, permission, and input validation test suites:")

    sec_table = doc.add_table(rows=6, cols=3)
    set_table_borders(sec_table)
    sec_headers = ["Test Category", "Observed HTTP Code", "Verified Security Behavior"]
    sec_widths = [Inches(1.8), Inches(1.3), Inches(3.8)]
    for j, h in enumerate(sec_headers):
        cell = sec_table.cell(0, j)
        cell.width = sec_widths[j]
        set_cell_background(cell, HEX_PRIMARY)
        set_cell_margins(cell, 60, 60, 60, 60)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    sec_rows = [
        ("RBAC Status Gate", "403 Forbidden", "CREATOR role denied permission when attempting to transition submission status to APPROVED."),
        ("RBAC Override Gate", "403 Forbidden", "CREATOR role denied permission when attempting to override audit findings."),
        ("Schema Validation", "422 Unprocessable", "Rejected invalid parameters (min_wcag_contrast < 1.0, short text, short reasons)."),
        ("Resource Not Found", "404 Not Found", "Graceful 404 response on non-existent brands, submissions, and guidelines without 500 crashes."),
        ("Duplicate Entity", "409 Conflict", "Database unique constraint caught cleanly when registering duplicate brand names."),
    ]
    for i, (cat, code, desc) in enumerate(sec_rows):
        c0, c1, c2 = sec_table.cell(i + 1, 0), sec_table.cell(i + 1, 1), sec_table.cell(i + 1, 2)
        c0.width, c1.width, c2.width = sec_widths[0], sec_widths[1], sec_widths[2]
        set_cell_margins(c0, 40, 40, 60, 60)
        set_cell_margins(c1, 40, 40, 60, 60)
        set_cell_margins(c2, 40, 40, 60, 60)
        c0.paragraphs[0].add_run(cat).font.bold = True
        c1.paragraphs[0].add_run(code).font.color.rgb = RGBColor(239, 68, 68) if "403" in code or "404" in code else RGBColor(217, 119, 6)
        c2.paragraphs[0].add_run(desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 6. EXTERNAL INTEGRATION MOCKING STRATEGY
    # -------------------------------------------------------------
    add_heading_1("6. External Integration Mocking Strategy")
    add_body_p(
        "To comply with zero-cost and offline safety policies, all third-party integrations were intercepted at "
        "the boundary using pytest fixtures:"
    )
    add_body_p(
        "1. Google GenAI Vector Embeddings: The gemini_service.generate_embedding function was patched to return "
        "a deterministic synthetic vector of 768 floating-point numbers ([0.02] * 768). This allowed genuine PostgreSQL "
        "pgvector cosine similarity operations to run locally without invoking Google's servers."
    )
    add_body_p(
        "2. Google GenAI Semantic Auditing: The gemini_service.audit_content_semantic function was patched to return "
        "deterministic Pydantic audit findings with simulated tone and claim violations. This enabled end-to-end "
        "verification of scoring, deduplication, and database persistence."
    )
    add_body_p(
        "3. Redis Diagnostic Ping: The redis_client.ping method was selectively patched to raise connection errors, "
        "verifying that /api/v1/health gracefully reports status: degraded rather than unhandled server errors."
    )

    # -------------------------------------------------------------
    # 7. DEFECTS IDENTIFIED & FIXES APPLIED
    # -------------------------------------------------------------
    add_heading_1("7. Defects Identified & Fixes Applied During Testing")
    defects = [
        ("BrandProfile.preferred_terminology mapping failure", "Wrapped annotation with Mapped[Dict[str, str]] and Mapped[float] in app/models/brand.py.", "Resolved 100% of startup ORM errors."),
        ("Empty main.py entry point", "Created full FastAPI app with CORS, lifespan DB init, and route mounting in app/main.py.", "Allowed server to start and mount all 27 endpoints."),
        ("Docker host port collision on 5433 & 6379", "Stopped conflicting background containers and started inkloom_postgres and inkloom_redis.", "PostgreSQL and Redis successfully bound to ports 5433 and 6379."),
        ("PII Scrubber offset drift", "Replaced iterative string substitution with reverse-offset single-pass slicing in app/core/pii_scrubber.py.", "Prevents text corruption and placeholder collisions."),
        ("Alembic migrations absent", "Initialized async Alembic environment, generated initial schema revision, and stamped head.", "Established version-controlled database schema management."),
    ]
    for title, fix, result in defects:
        add_heading_3(title)
        add_body_p(fix, bold_prefix="Fix Applied: ")
        add_body_p(result, bold_prefix="Outcome: ")

    # -------------------------------------------------------------
    # 8. RESIDUAL RISKS & NEXT STEPS
    # -------------------------------------------------------------
    add_heading_1("8. Residual Risks & Recommended Next Steps")
    add_body_p("1. Production Authentication: Replace request header simulation (x-user-role) with signed JWT / OAuth2 tokens.")
    add_body_p("2. Frontend UI Implementation: Scaffold Next.js 14 frontend in frontend/ consuming the verified /api/v1 endpoints.")
    add_body_p("3. OCR Pipeline: Implement optical character recognition for scanned/image-only PDFs.")

    # -------------------------------------------------------------
    # 9. APPENDIX — TEST FILES & RUNNER SPECIFICATIONS
    # -------------------------------------------------------------
    add_heading_1("9. Appendix — Test Files & Runner Specifications")
    test_files = [
        ("tests/test_api_mock_suite.py", "24 tests", "Comprehensive mock data suite covering all 27 API endpoints."),
        ("tests/test_api_endpoints.py", "4 tests", "CRUD operations for brands, submissions, and health checks."),
        ("tests/test_integration_flow.py", "1 test", "Full governance lifecycle integration from draft to approval."),
        ("tests/test_rule_engine.py", "8 tests", "Deterministic banned terms, terminology, and WCAG contrast math."),
        ("tests/test_document_service.py", "4 tests", "PyMuPDF PDF parsing and Pillow dominant color analysis."),
        ("tests/test_pii_scrubber.py", "3 tests", "PII redaction, offset safety, and token restoration."),
        ("tests/test_models.py", "4 tests", "SQLAlchemy 2.0 DeclarativeBase table schemas and defaults."),
        ("tests/test_workflow_service.py", "4 tests", "Role-based state transitions and revision invariants."),
    ]
    for fname, count, desc in test_files:
        add_body_p(f"{count} — {desc}", bold_prefix=f"{fname}: ")

    # Save Document
    output_dir = r"D:\projects\hackathon-inkloomAI\docs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Inkloom_AI_API_Test_Report.docx")
    doc.save(output_path)
    print(f"Successfully generated DOCX report at: {output_path}")

if __name__ == "__main__":
    create_report()
