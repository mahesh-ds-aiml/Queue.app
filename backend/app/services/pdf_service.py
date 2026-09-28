import os
import pypdf
from PIL import Image

def get_page_count(file_path: str) -> int:
    """Detects total page count for PDF, image, or docx files."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        try:
            reader = pypdf.PdfReader(file_path)
            return len(reader.pages)
        except Exception:
            return 1
    elif ext in [".jpg", ".jpeg", ".png"]:
        return 1
    elif ext == ".docx":
        try:
            import docx
            doc = docx.Document(file_path)
            # Roughly estimate 1 page per 400 words or minimum 1 page
            total_words = sum(len(p.text.split()) for p in doc.paragraphs)
            return max(1, round(total_words / 350))
        except Exception:
            return 1
    return 1

def count_pages_in_range(total_pages: int, page_range_str: str) -> int:
    """Calculates how many pages are selected by page_range string (e.g., '1-5', '2,4,6', 'all')."""
    if not page_range_str or page_range_str.strip().lower() in ["all", ""]:
        return total_pages
    
    selected_pages = set()
    parts = page_range_str.split(",")
    for part in parts:
        part = part.strip()
        if "-" in part:
            sub = part.split("-")
            if len(sub) == 2 and sub[0].isdigit() and sub[1].isdigit():
                start, end = int(sub[0]), int(sub[1])
                for p in range(start, end + 1):
                    if 1 <= p <= total_pages:
                        selected_pages.add(p)
        elif part.isdigit():
            p = int(part)
            if 1 <= p <= total_pages:
                selected_pages.add(p)
                
    return len(selected_pages) if selected_pages else total_pages
