import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Verifies GET /api/v1/health returns healthy for database, pgvector, and redis."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"
    assert "pgvector" in data["pgvector"]
    assert data["redis"] == "healthy"
    assert data["ai_integration"]["configured"] is True


@pytest.mark.asyncio
async def test_brands_crud_api(client: AsyncClient):
    """Verifies listing and creating brand profiles via REST API."""
    # List brands
    res = await client.get("/api/v1/brands")
    assert res.status_code == 200
    brands = res.json()
    assert len(brands) >= 1

    # Create new unique brand
    import uuid
    brand_name = f"NovaSphere FinTech {uuid.uuid4().hex[:6]}"
    payload = {
        "name": brand_name,
        "industry": "Financial Technology",
        "tone_persona": "Prudent, precise, and regulatory compliant.",
        "approved_hex_palette": ["#002B49", "#00A3E0", "#FFFFFF"],
        "banned_terms": ["risk-free", "get-rich", "unlimited returns"],
        "preferred_terminology": {"crypto": "digital assets"},
        "approved_facts": [],
        "visual_guidelines_summary": "Navy blue headers with high contrast.",
        "min_wcag_contrast": 4.5,
    }
    create_res = await client.post("/api/v1/brands", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == brand_name
    assert created["id"] is not None

    # Retrieve created brand
    get_res = await client.get(f"/api/v1/brands/{created['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == brand_name


@pytest.mark.asyncio
async def test_submissions_api(client: AsyncClient):
    """Verifies creating and querying a submission draft."""
    payload = {
        "brand_id": 1,
        "title": "API Test Marketing Copy",
        "content_format": "TEXT",
        "initial_content": "Experience our fast, cost-effective infrastructure.",
    }
    res = await client.post("/api/v1/submissions", json=payload)
    assert res.status_code == 201
    sub = res.json()
    assert sub["title"] == "API Test Marketing Copy"
    assert sub["status"] == "DRAFT"
    assert len(sub["revisions"]) >= 1


@pytest.mark.asyncio
async def test_analytics_api(client: AsyncClient):
    """Verifies GET /api/v1/analytics/{brand_id} returns governance metrics."""
    res = await client.get("/api/v1/analytics/1")
    assert res.status_code == 200
    data = res.json()
    assert "total_submissions" in data
    assert "avg_compliance_score" in data
    assert "findings_by_severity" in data
    assert "ambiguous_guidelines" in data
