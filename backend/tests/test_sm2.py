import pytest
from backend.pipeline.sm2 import update_schedule, SM2State


def make_state(interval=1.0, ease=2.5, reps=0):
    return SM2State(interval_days=interval, ease_factor=ease, repetitions=reps)


def test_correct_knew_it_increases_interval_and_ease():
    state = make_state(interval=4.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="knew_it")
    assert new.interval_days == pytest.approx(4.0 * 2.5)
    assert new.ease_factor == pytest.approx(2.6)
    assert new.repetitions == 1


def test_correct_somewhat_sure_increases_interval_keeps_ease():
    state = make_state(interval=4.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="somewhat_sure")
    assert new.interval_days == pytest.approx(4.0 * 2.5)
    assert new.ease_factor == pytest.approx(2.5)
    assert new.repetitions == 1


def test_correct_guessed_reduces_interval_slightly():
    state = make_state(interval=4.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="guessed")
    assert new.interval_days == pytest.approx(max(1.0, 4.0 * 0.8))
    assert new.repetitions == 1


def test_incorrect_resets_interval_and_reduces_ease():
    state = make_state(interval=10.0, ease=2.5, reps=3)
    new = update_schedule(state, correct=False, confidence="guessed")
    assert new.interval_days == pytest.approx(1.0)
    assert new.ease_factor == pytest.approx(2.3)
    assert new.repetitions == 0


def test_ease_factor_never_drops_below_1_3():
    state = make_state(ease=1.4)
    new = update_schedule(state, correct=False, confidence="guessed")
    assert new.ease_factor >= 1.3


def test_ease_factor_never_exceeds_3_0():
    state = make_state(ease=2.95)
    new = update_schedule(state, correct=True, confidence="knew_it")
    assert new.ease_factor <= 3.0


def test_guessed_interval_floor_is_1():
    state = make_state(interval=1.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="guessed")
    assert new.interval_days >= 1.0
