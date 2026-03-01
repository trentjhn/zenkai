from dataclasses import dataclass


@dataclass
class SM2State:
    interval_days: float
    ease_factor: float
    repetitions: int


def update_schedule(state: SM2State, correct: bool, confidence: str) -> SM2State:
    """
    SM-2 simplified. Returns a new SM2State — does not mutate.

    Confidence: 'knew_it' | 'somewhat_sure' | 'guessed'
    """
    interval = state.interval_days
    ease     = state.ease_factor
    reps     = state.repetitions

    if correct:
        if confidence == "knew_it":
            interval = interval * ease
            ease = min(3.0, ease + 0.1)
        elif confidence == "somewhat_sure":
            interval = interval * ease
        elif confidence == "guessed":
            # Trust a correct guess less — interval grows slowly
            interval = max(1.0, interval * 0.8)
        reps += 1
    else:
        interval = 1.0
        ease = max(1.3, ease - 0.2)
        reps = 0

    return SM2State(interval_days=interval, ease_factor=ease, repetitions=reps)
