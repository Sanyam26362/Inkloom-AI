import io
import fitz
from PIL import Image
import pytest
from app.services.document_service import DocumentService


def create_sample_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_sample_image() -> bytes:
    img = Image.new("RGB", (100, 100), color="#2563EB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_pdf_extraction_success():
    pdf_content = (
        "Section: Accessibility Guidelines\n\n"
        "All visual text must satisfy WCAG AA contrast ratio of at least 4.5:1 against the background."
    )
    pdf_bytes = create_sample_pdf(pdf_content)
    chunks = DocumentService.extract_chunks_from_pdf(pdf_bytes, "guideline.pdf")
    assert len(chunks) >= 1
    assert chunks[0]["source_document"] == "guideline.pdf"
    assert chunks[0]["page_number"] == 1
    assert "contrast ratio" in chunks[0]["content_text"].lower()


def test_corrupt_pdf_raises_error():
    corrupt_bytes = b"NOT_A_VALID_PDF_HEADER_123456"
    with pytest.raises(ValueError, match="Failed to parse PDF document"):
        DocumentService.extract_chunks_from_pdf(corrupt_bytes, "corrupt.pdf")


def test_image_analysis():
    img_bytes = create_sample_image()
    analysis = DocumentService.analyze_image(img_bytes)
    assert analysis["width"] == 100
    assert analysis["height"] == 100
    assert analysis["format"] == "PNG"
    assert len(analysis["dominant_hex_colors"]) >= 1


def test_corrupt_image_raises_error():
    with pytest.raises(ValueError, match="Invalid or corrupted image"):
        DocumentService.analyze_image(b"NOT_AN_IMAGE")
