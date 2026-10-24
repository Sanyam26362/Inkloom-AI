import io
import re
import hashlib
import fitz  # PyMuPDF
from PIL import Image
import numpy as np
from typing import List, Dict, Any, Optional


class DocumentService:
    """Safe document extraction for PDFs, Markdown, and TXT guidelines, and image processing."""

    MAX_FILE_SIZE_MB = 20
    MAX_IMAGE_SIZE_MB = 10

    @classmethod
    def extract_chunks(
        cls, file_bytes: bytes, filename: str, document_type: str = "guidelines"
    ) -> List[Dict[str, Any]]:
        """Dispatches chunk extraction based on file extension."""
        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            chunks = cls.extract_chunks_from_pdf(file_bytes, filename)
        elif lower_name.endswith(".md"):
            text = file_bytes.decode("utf-8", errors="replace")
            chunks = cls.extract_chunks_from_markdown(text, filename)
        elif lower_name.endswith(".txt"):
            text = file_bytes.decode("utf-8", errors="replace")
            chunks = cls.extract_chunks_from_text(text, filename)
        else:
            raise ValueError(f"Unsupported file format: {filename}. Supported: .pdf, .md, .txt")

        for c in chunks:
            c["document_type"] = document_type
        return chunks

    @classmethod
    def extract_chunks_from_pdf(
        cls, pdf_bytes: bytes, filename: str, max_chunk_words: int = 140
    ) -> List[Dict[str, Any]]:
        """
        Extracts semantic, heading-aware chunks from a PDF using PyMuPDF blocks and text spans.
        Detects headings by font size/weight and section numbering ('4.', '4.1', etc.).
        Produces meaningful section_reference names, never 'Page N Section'.
        Keeps table rows and bullet list items intact. Chunks do not exceed 250 words.
        """
        if len(pdf_bytes) > cls.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise ValueError(f"PDF exceeds maximum file size of {cls.MAX_FILE_SIZE_MB}MB")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {str(e)}")

        if doc.page_count == 0:
            doc.close()
            raise ValueError("PDF document is empty (0 pages)")

        chunks: List[Dict[str, Any]] = []
        current_section = "Document Overview"

        buffer_units: List[str] = []
        buffer_words = 0
        buffer_page = 1

        def flush():
            nonlocal buffer_units, buffer_words, buffer_page
            if not buffer_units:
                return
            content = "\n\n".join(buffer_units).strip()
            if content:
                c_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append({
                    "source_document": filename,
                    "page_number": buffer_page,
                    "section_reference": current_section,
                    "rule_category": cls.infer_category(content, current_section),
                    "content_text": content,
                    "content_hash": c_hash,
                    "word_count": len(content.split()),
                })
            buffer_units = []
            buffer_words = 0

        try:
            for page_idx in range(doc.page_count):
                page = doc[page_idx]
                page_num = page_idx + 1

                # Use page.get_text("blocks") for high-level block layout
                blocks = page.get_text("blocks")
                # Also inspect page.get_text("dict") for font metadata
                page_dict = page.get_text("dict")

                # Extract font size map for headings
                large_bold_texts = set()
                for b in page_dict.get("blocks", []):
                    for l in b.get("lines", []):
                        for s in l.get("spans", []):
                            stext = s.get("text", "").strip()
                            ssize = s.get("size", 10.0)
                            sflags = s.get("flags", 0)
                            # Flag bit 4 (16) or bit 1 (2) indicates bold font, or size >= 12
                            if (ssize >= 13.0 or (sflags & 2 != 0 and ssize >= 11.0)) and len(stext) <= 80:
                                large_bold_texts.add(stext)

                for b in blocks:
                    if b[6] != 0:  # image or non-text block
                        continue
                    text = b[4].strip()
                    if not text or text == "---":
                        continue

                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    if not lines:
                        continue

                    first_line = lines[0]
                    # Check if first line is a heading
                    heading_match = re.match(r"^(#+\s+|\d+(\.\d+)*\s+)(.+)$", first_line)
                    is_large_bold = first_line in large_bold_texts or any(h in first_line for h in large_bold_texts if len(h) > 5)

                    if heading_match or (is_large_bold and len(first_line.split()) <= 10 and not first_line.startswith("|")):
                        cleaned = re.sub(r"^[#\s]+", "", first_line).strip()
                        if len(cleaned) > 2 and not cleaned.startswith("|"):
                            flush()
                            current_section = cleaned
                            buffer_page = page_num
                            lines = lines[1:]
                            if not lines:
                                continue

                    # Process table lines atomically
                    if any(l.startswith("|") for l in lines):
                        table_lines = [l for l in lines if l.startswith("|")]
                        header = table_lines[:2] if len(table_lines) >= 2 else []
                        rows = table_lines[2:] if len(table_lines) >= 2 else table_lines
                        for row in rows:
                            row_content = "\n".join(header + [row]) if header else row
                            rc_words = len(row_content.split())
                            if buffer_words + rc_words > max_chunk_words and buffer_units:
                                flush()
                                buffer_page = page_num
                            buffer_units.append(row_content)
                            buffer_words += rc_words
                        continue

                    # Group bullet list items and paragraphs
                    items: List[str] = []
                    curr_item: List[str] = []
                    for line in lines:
                        if re.match(r"^(\*|-|•|\d+\.)\s+", line) and curr_item:
                            items.append("\n".join(curr_item))
                            curr_item = [line]
                        else:
                            curr_item.append(line)
                    if curr_item:
                        items.append("\n".join(curr_item))

                    for item in items:
                        iw = len(item.split())
                        if iw > 220:
                            # Split large paragraph by sentence
                            sents = re.split(r"(?<=[.!?])\s+", item)
                            sg: List[str] = []
                            sg_words = 0
                            for s in sents:
                                sw = len(s.split())
                                if sg_words + sw > max_chunk_words and sg:
                                    sub_text = " ".join(sg)
                                    if buffer_words + len(sub_text.split()) > max_chunk_words and buffer_units:
                                        flush()
                                        buffer_page = page_num
                                    buffer_units.append(sub_text)
                                    buffer_words += len(sub_text.split())
                                    sg = [s]
                                    sg_words = sw
                                else:
                                    sg.append(s)
                                    sg_words += sw
                            if sg:
                                sub_text = " ".join(sg)
                                if buffer_words + len(sub_text.split()) > max_chunk_words and buffer_units:
                                    flush()
                                    buffer_page = page_num
                                buffer_units.append(sub_text)
                                buffer_words += len(sub_text.split())
                        else:
                            if buffer_words + iw > max_chunk_words and buffer_units:
                                flush()
                                buffer_page = page_num
                            buffer_units.append(item)
                            buffer_words += iw

            flush()
        finally:
            doc.close()

        if not chunks:
            raise ValueError("No readable text found in PDF. It may be a scanned or encrypted document.")

        return chunks

    @classmethod
    def extract_chunks_from_markdown(
        cls, markdown_text: str, filename: str, max_chunk_words: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Heading-aware markdown chunker splitting on ## and ### headers.
        Preserves heading hierarchy in section_reference.
        Keeps table rows and lists intact without blind character slicing.
        """
        if not markdown_text.strip():
            raise ValueError("Markdown document is empty")

        chunks: List[Dict[str, Any]] = []
        lines = markdown_text.splitlines()

        doc_title = filename
        h2_title = ""
        h3_title = ""

        current_units: List[str] = []
        current_words = 0

        def get_section_ref() -> str:
            parts = []
            if h2_title:
                parts.append(h2_title)
            if h3_title and h3_title != h2_title:
                parts.append(h3_title)
            return " > ".join(parts) if parts else doc_title

        def flush():
            nonlocal current_units, current_words
            if not current_units:
                return
            content = "\n\n".join(current_units).strip()
            if content:
                sec_ref = get_section_ref()
                c_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append({
                    "source_document": filename,
                    "page_number": 1,
                    "section_reference": sec_ref,
                    "rule_category": cls.infer_category(content, sec_ref),
                    "content_text": content,
                    "content_hash": c_hash,
                    "word_count": len(content.split()),
                })
            current_units = []
            current_words = 0

        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # Heading 1
            if stripped.startswith("# ") and not stripped.startswith("## "):
                doc_title = stripped.lstrip("#").strip()
                i += 1
                continue

            # Heading 2
            if stripped.startswith("## ") and not stripped.startswith("### "):
                flush()
                h2_title = stripped.lstrip("#").strip()
                h3_title = ""
                i += 1
                continue

            # Heading 3
            if stripped.startswith("### "):
                flush()
                h3_title = stripped.lstrip("#").strip()
                i += 1
                continue

            # Markdown Table handling
            if stripped.startswith("|") and stripped.endswith("|"):
                table_lines = [stripped]
                i += 1
                while i < len(lines) and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                    table_lines.append(lines[i].strip())
                    i += 1

                header = table_lines[:2] if len(table_lines) >= 2 else []
                rows = table_lines[2:] if len(table_lines) >= 2 else table_lines
                for row in rows:
                    row_content = "\n".join(header + [row]) if header else row
                    rc_words = len(row_content.split())
                    if current_words + rc_words > max_chunk_words and current_units:
                        flush()
                    current_units.append(row_content)
                    current_words += rc_words
                continue

            # Skip horizontal rules
            if stripped in ("---", "***", "___"):
                i += 1
                continue

            # Regular text or bullet item
            if stripped:
                w = len(stripped.split())
                if current_words + w > max_chunk_words and current_units:
                    flush()
                current_units.append(stripped)
                current_words += w

            i += 1

        flush()
        return chunks

    @classmethod
    def extract_chunks_from_text(
        cls, text: str, filename: str, max_chunk_words: int = 150
    ) -> List[Dict[str, Any]]:
        """Splits raw text files into semantic chunks."""
        if not text.strip():
            raise ValueError("Text document is empty")

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks: List[Dict[str, Any]] = []

        buffer: List[str] = []
        words = 0
        section = filename.replace(".txt", "").replace("_", " ").title()

        def flush():
            nonlocal buffer, words
            if not buffer:
                return
            content = "\n\n".join(buffer).strip()
            if content:
                c_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append({
                    "source_document": filename,
                    "page_number": 1,
                    "section_reference": section,
                    "rule_category": cls.infer_category(content, section),
                    "content_text": content,
                    "content_hash": c_hash,
                    "word_count": len(content.split()),
                })
            buffer = []
            words = 0

        for p in paragraphs:
            pw = len(p.split())
            if words + pw > max_chunk_words and buffer:
                flush()
            buffer.append(p)
            words += pw

        flush()
        return chunks

    @staticmethod
    def infer_category(text: str, section: str = "") -> str:
        """Infers rule category based on text content and section context."""
        combined = f"{section} {text}".lower()

        if any(w in combined for w in ["prohibited", "banned", "illegal", "forbidden", "crack", "firework", "spider-man", "weapon"]):
            return "PROHIBITED"
        if any(w in combined for w in ["diwali", "holi", "event", "festival", "festive", "campaign cue", "upcoming"]):
            return "EVENT"
        if any(w in combined for w in ["decision", "pass", "fail", "needs_review", "rubric", "criteria"]):
            return "DECISION"
        if any(w in combined for w in ["wcag", "contrast", "accessible", "alt text", "screen reader"]):
            return "ACCESSIBILITY"
        if any(w in combined for w in ["color", "palette", "logo", "typography", "hex", "font", "padding", "swatch"]):
            return "VISUAL"
        if any(w in combined for w in ["tone", "voice", "persona", "empathetic", "superlative", "humor", "audio", "voiceover"]):
            return "TONE"
        if any(w in combined for w in ["term", "word", "naming", "lexicon", "phrase", "preferred"]):
            return "TERMINOLOGY"
        if any(w in combined for w in ["claim", "stat", "metric", "revenue", "uptime", "customer", "fact", "sla"]):
            return "FACTUAL_CLAIM"

        return "GENERAL"

    @classmethod
    def analyze_image(cls, image_bytes: bytes) -> Dict[str, Any]:
        """Validates image, extracts dimensions, format, and dominant hex colors."""
        if len(image_bytes) > cls.MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise ValueError(f"Image exceeds maximum size of {cls.MAX_IMAGE_SIZE_MB}MB")

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image file: {str(e)}")

        rgb_img = image.convert("RGB")
        width, height = rgb_img.size

        thumb = rgb_img.resize((64, 64))
        arr = np.array(thumb)
        pixels = arr.reshape(-1, 3)

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
