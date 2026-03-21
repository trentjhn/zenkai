from backend.pipeline.kb_reader import extract_concept_section, compute_section_hash, list_concept_sections

SAMPLE_KB = """# Prompt Engineering

## Chain-of-Thought Prompting

Chain-of-thought (CoT) prompting involves including intermediate reasoning steps.
It works by showing the model how to think through a problem step by step.

Key finding: MultiArith accuracy went from 17.7% to 78.7% with zero-shot CoT.

## Self-Consistency

Self-consistency samples multiple reasoning paths and takes a majority vote.
"""


def test_extract_concept_section():
    section = extract_concept_section(SAMPLE_KB, "Chain-of-Thought Prompting")
    assert "Chain-of-thought (CoT)" in section
    assert "MultiArith" in section
    assert "Self-Consistency" not in section


def test_extract_missing_section_returns_none():
    section = extract_concept_section(SAMPLE_KB, "Nonexistent Concept")
    assert section is None


def test_compute_section_hash_is_deterministic():
    h1 = compute_section_hash("some content")
    h2 = compute_section_hash("some content")
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex


def test_compute_section_hash_changes_on_edit():
    h1 = compute_section_hash("original content")
    h2 = compute_section_hash("modified content")
    assert h1 != h2


def test_list_concept_sections():
    sections = list_concept_sections(SAMPLE_KB)
    assert "Chain-of-Thought Prompting" in sections
    assert "Self-Consistency" in sections
    assert len(sections) == 2


def test_read_kb_directory_returns_dict_of_file_contents(tmp_path):
    """Each .md file in the dir becomes an entry: {stem: text}."""
    (tmp_path / "foo.md").write_text("# Foo\nsome content")
    (tmp_path / "bar.md").write_text("# Bar\nother content")
    (tmp_path / "ignore.txt").write_text("ignored")

    from backend.pipeline.kb_reader import read_kb_directory
    result = read_kb_directory(str(tmp_path))
    assert set(result.keys()) == {"foo", "bar"}
    assert "some content" in result["foo"]
    assert "other content" in result["bar"]


def test_read_kb_directory_sorted_alphabetically(tmp_path):
    """Files are returned in sorted order (deterministic concept order_index)."""
    (tmp_path / "zzz.md").write_text("last")
    (tmp_path / "aaa.md").write_text("first")
    from backend.pipeline.kb_reader import read_kb_directory
    result = read_kb_directory(str(tmp_path))
    assert list(result.keys()) == ["aaa", "zzz"]


def test_read_kb_directory_raises_if_path_not_dir(tmp_path):
    """Raises FileNotFoundError if the directory does not exist."""
    from backend.pipeline.kb_reader import read_kb_directory
    import pytest
    with pytest.raises(FileNotFoundError):
        read_kb_directory(str(tmp_path / "nonexistent"))
