import io
import fitz  # PyMuPDF
from PIL import Image
import numpy as np
from typing import List, Dict, Any, Optional


class DocumentService:
    """Safe document extraction for PDFs and image processing for brand visual checks."""

    MAX_PDF_SIZE_MB = 15
    MAX_IMAGE_SIZE_MB = 10

    @classmethod
    def extract_chunks_from_pdf(
        cls, pdf_bytes: bytes, filename: str, max_chunk_words: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Extracts structured chunks with page numbers and section headers from a PDF.
        Handles empty, corrupted, and multi-page PDFs safely.
        """
        if len(pdf_bytes) > cls.MAX_PDF_SIZE_MB * 1024 * 1024:
            raise ValueError(f"PDF exceeds maximum file size of {cls.MAX_PDF_SIZE_MB}MB")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {str(e)}")

        if doc.page_count == 0:
            doc.close()
            raise ValueError("PDF document is empty (0 pages)")

        chunks: List[Dict[str, Any]] = []

        try:
            for page_idx in range(doc.page_count):
                page = doc[page_idx]
                page_num = page_idx + 1
                text = page.get_text("text").strip()

                if not text:
                    continue  # Scanned or blank page without OCR

                # Simple paragraph / section splitting
                paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                current_section = f"Page {page_num} Section"

                current_chunk_words: List[str] = []
                for p in paragraphs:
                    words = p.split()
                    # Heuristic for section title: short line ending with colon or uppercase
                    if len(words) <= 7 and (p.endswith(":") or p.isupper() or "Guideline" in p or "Rule" in p):
                        current_section = p.rstrip(":")

                    if len(current_chunk_words) + len(words) > max_chunk_words and current_chunk_words:
                        chunk_text = " ".join(current_chunk_words)
                        chunks.append({
                            "source_document": filename,
                            "page_number": page_num,
                            "section_reference": current_section,
                            "rule_category": cls.infer_category(chunk_text),
                            "content_text": chunk_text,
                        })
                        current_chunk_words = []

                    current_chunk_words.extend(words)

                if current_chunk_words:
                    chunk_text = " ".join(current_chunk_words)
                    chunks.append({
                        "source_document": filename,
                        "page_number": page_num,
                        "section_reference": current_section,
                        "rule_category": cls.infer_category(chunk_text),
                        "content_text": chunk_text,
                    })
        finally:
            doc.close()

        if not chunks:
            raise ValueError("No readable text found in PDF. It may be a scanned or encrypted document.")

        return chunks

    @staticmethod
    def infer_category(text: str) -> str:
        """Infers category based on keyword markers in guideline text."""
        lower = text.lower()
        if any(w in lower for w in ["color", "palette", "logo", "typography", "hex", "font", "padding"]):
            return "VISUAL"
        if any(w in lower for w in ["wcag", "contrast", "accessible", "alt text", "screen reader"]):
            return "ACCESSIBILITY"
        if any(w in lower for w in ["tone", "voice", "persona", "empathetic", "superlative", "humor"]):
            return "TONE"
        if any(w in lower for w in ["claim", "stat", "metric", "revenue", "uptime", "customer", "fact", "sla"]):
            return "FACTUAL_CLAIM"
        if any(w in lower for w in ["term", "word", "naming", "lexicon", "phrase"]):
            return "TERMINOLOGY"
        return "GENERAL"

    @classmethod
    def analyze_image(cls, image_bytes: bytes) -> Dict[str, Any]:
        """
        Validates image, extracts dimensions, format, and top dominant hex colors.
        """
        if len(image_bytes) > cls.MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise ValueError(f"Image exceeds maximum size of {cls.MAX_IMAGE_SIZE_MB}MB")

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()  # Verify integrity
            # Reopen after verify
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image file: {str(e)}")

        # Convert to RGB if needed
        rgb_img = image.convert("RGB")
        width, height = rgb_img.size

        # Thumbnail for fast dominant color clustering
        thumb = rgb_img.resize((64, 64))
        arr = np.array(thumb)
        pixels = arr.reshape(-1, 3)

        # Quantize colors to round multiples of 16 to group similar tones
        quantized = (pixels // 16) * 16
        unique_colors, counts = np.unique(quantized, axis=0, return_counts=True)
        sorted_indices = np.argsort(-counts)

        dominant_hex: List[str] = []
        for idx in sorted_indices[:5]:
            r, g, b = unique_colors[idx]
            hex_code = f"#{int(r):02X}{int(g):02X}{int(b):02X}"
            dominant_hex.append(hex_code)

        return {
            "width": width,
            "height": height,
            "format": image.format or "UNKNOWN",
            "aspect_ratio": round(width / max(1, height), 2),
            "dominant_hex_colors": dominant_hex,
        }
