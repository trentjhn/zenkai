from backend.pipeline.orchestrator import should_regenerate_concept


def test_should_regenerate_when_no_hash():
    assert should_regenerate_concept(stored_hash=None, current_hash="abc123") is True


def test_should_not_regenerate_when_hash_matches():
    assert should_regenerate_concept(stored_hash="abc123", current_hash="abc123") is False


def test_should_regenerate_when_hash_changed():
    assert should_regenerate_concept(stored_hash="old123", current_hash="new456") is True
