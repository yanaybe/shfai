import io
import logging
from pathlib import Path

log = logging.getLogger(__name__)

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext in SUPPORTED_IMAGE_EXTS:
        return _extract_image(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_pdf(file_path: str) -> str:
    """Try pdfplumber first (fast for digital PDFs), fall back to OCR for scanned."""
    import pdfplumber

    text_parts: list[str] = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        combined = "\n".join(text_parts).strip()
        if len(combined) > 100:
            log.info("pdfplumber extracted %d chars from %s", len(combined), file_path)
            return combined
    except Exception as e:
        log.warning("pdfplumber failed: %s — falling back to OCR", e)

    return _ocr_pdf(file_path)


def _ocr_pdf(file_path: str) -> str:
    """Convert PDF pages to images, run Tesseract."""
    from pdf2image import convert_from_path
    import pytesseract

    images = convert_from_path(file_path, dpi=300)
    text_parts: list[str] = []
    for img in images:
        text = pytesseract.image_to_string(img, config="--psm 6")
        text_parts.append(text)

    combined = "\n".join(text_parts).strip()
    log.info("OCR (PDF→image) extracted %d chars from %s", len(combined), file_path)
    return combined


def _extract_image(file_path: str) -> str:
    import pytesseract
    from PIL import Image

    img = Image.open(file_path)
    text = pytesseract.image_to_string(img, config="--psm 6")
    log.info("pytesseract extracted %d chars from %s", len(text), file_path)
    return text.strip()
