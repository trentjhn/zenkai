import hashlib
import re
from pathlib import Path
from typing import Optional


def read_kb_doc(kb_path: str, relative_path: str) -> str:
    full_path = Path(kb_path) / relative_path
    if not full_path.exists():
        raise FileNotFoundError(f"KB doc not found: {full_path}")
    return full_path.read_text(encoding="utf-8")


def read_kb_directory(dir_path: str) -> dict[str, str]:
    """
    Read all .md files in a directory.
    Returns {filename_stem: file_text} sorted alphabetically.
    Used for directory-based modules like Module 10 (Playbooks).
    """
    path = Path(dir_path)
    if not path.is_dir():
        raise FileNotFoundError(f"KB directory not found: {path.resolve()}")
    files = sorted(f for f in path.glob("*.md") if f.stem != "README")
    return {f.stem: f.read_text(encoding="utf-8") for f in files}


def extract_concept_section(doc_text: str, section_title: str) -> Optional[str]:
    """Extract text under a ## heading, stopping at the next ## heading."""
    pattern = rf"(## {re.escape(section_title)}\n[\s\S]*?)(?=\n## |\Z)"
    match = re.search(pattern, doc_text)
    return match.group(1).strip() if match else None


def list_concept_sections(doc_text: str) -> list[str]:
    """Return all ## section titles from a KB doc."""
    return re.findall(r"^## (.+)$", doc_text, re.MULTILINE)


def compute_section_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
