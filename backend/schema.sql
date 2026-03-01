PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL DEFAULT 'default',
    character_form  INTEGER NOT NULL DEFAULT 1,          -- 1=Ronin, 2=Warrior, 3=Samurai, 4=Ghost
    total_xp        INTEGER NOT NULL DEFAULT 0,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_study_date DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
    id                  INTEGER PRIMARY KEY,
    order_index         INTEGER NOT NULL UNIQUE,         -- 0-9
    title               TEXT NOT NULL,
    kb_source_path      TEXT,                            -- NULL for Module 0 (PM only)
    pm_context_path     TEXT,                            -- NULL for Modules 1-9 (KB only)
    last_synced_commit  TEXT,                            -- git hash of last generation
    is_unlocked         BOOLEAN NOT NULL DEFAULT 0,
    quiz_score_achieved REAL,                            -- 0.0-1.0, NULL until attempted
    unlocked_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concepts (
    id                  INTEGER PRIMARY KEY,
    module_id           INTEGER NOT NULL REFERENCES modules(id),
    order_index         INTEGER NOT NULL,
    title               TEXT NOT NULL,
    default_layer       TEXT NOT NULL,                   -- Prompt 1a output (JSON)
    deep_layer          TEXT NOT NULL,                   -- Prompt 1b output (JSON)
    prediction_question TEXT NOT NULL,                   -- Prompt 1c output (JSON)
    worked_example      TEXT NOT NULL,                   -- Prompt 1d output (JSON)
    spec_exercise       TEXT,                            -- Prompt 1e output (JSON, optional)
    pm_application      TEXT,                            -- Prompt 1f output (JSON, optional)
    cheatsheet          TEXT,                            -- Prompt 1g output (JSON, optional)
    content_hash        TEXT NOT NULL,                   -- SHA-256 of source KB section
    generated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concept_reads (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    concept_id      INTEGER NOT NULL REFERENCES concepts(id),
    read_default    BOOLEAN NOT NULL DEFAULT 0,          -- default layer read
    read_deep       BOOLEAN NOT NULL DEFAULT 0,          -- go deeper layer read
    first_read_at   TIMESTAMP,
    deep_read_at    TIMESTAMP,
    UNIQUE(user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id              INTEGER PRIMARY KEY,
    concept_id      INTEGER NOT NULL REFERENCES concepts(id),
    question_type   TEXT NOT NULL,                       -- 'mc', 'scenario', 'prediction', 'ordering', 'match'
    scenario_type   TEXT,                                -- 'system_design', 'production_failure', 'risk_communication'
    content         TEXT NOT NULL,                       -- full question object (JSON)
    generated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_progress (
    id                  INTEGER PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    concept_id          INTEGER NOT NULL REFERENCES concepts(id),
    quiz_question_id    INTEGER REFERENCES quiz_questions(id),   -- NULL for concept reads, set for quiz answers
    answered_correctly  BOOLEAN NOT NULL,
    confidence          TEXT NOT NULL,                           -- 'guessed', 'somewhat_sure', 'knew_it'
    answered_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_spent_ms       INTEGER
);

CREATE TABLE IF NOT EXISTS review_schedule (
    id               INTEGER PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    concept_id       INTEGER NOT NULL REFERENCES concepts(id),
    next_review_at   TIMESTAMP NOT NULL,
    interval_days    REAL NOT NULL DEFAULT 1.0,          -- current SRS interval
    ease_factor      REAL NOT NULL DEFAULT 2.5,          -- SM-2 ease factor
    repetitions      INTEGER NOT NULL DEFAULT 0,         -- successful review count
    last_reviewed_at TIMESTAMP,
    UNIQUE(user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id                  INTEGER PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    module_id           INTEGER REFERENCES modules(id),
    started_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at            TIMESTAMP,
    questions_answered  INTEGER NOT NULL DEFAULT 0,
    correct_answers     INTEGER NOT NULL DEFAULT 0,
    concepts_read       INTEGER NOT NULL DEFAULT 0,
    xp_earned           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS character_equipment (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    module_id       INTEGER NOT NULL REFERENCES modules(id),
    equipment_name  TEXT NOT NULL,
    equipped_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spec_exercises (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    module_id       INTEGER NOT NULL REFERENCES modules(id),
    user_response   TEXT NOT NULL,
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_log (
    id              INTEGER PRIMARY KEY,
    module_id       INTEGER REFERENCES modules(id),
    concept_id      INTEGER REFERENCES concepts(id),
    prompt_type     TEXT NOT NULL,
    model_used      TEXT NOT NULL,
    success         BOOLEAN NOT NULL,
    error_message   TEXT,
    run_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default user and all 10 modules (Module 0 always unlocked)
INSERT OR IGNORE INTO users (id, username) VALUES (1, 'trenton');

INSERT OR IGNORE INTO modules (order_index, title, kb_source_path, pm_context_path, is_unlocked) VALUES
(0, 'AI PM Foundations',    NULL,                                          'pm-context/ai-pm-role.md',         1),
(1, 'Prompt Engineering',   'prompt-engineering/prompt-engineering.md',    NULL,                               0),
(2, 'Context Engineering',  'context-engineering/context-engineering.md',  NULL,                               0),
(3, 'Reasoning LLMs',       'reasoning-llms/reasoning-llms.md',           NULL,                               0),
(4, 'Agentic Engineering',  'agentic-engineering/agentic-engineering.md',  NULL,                               0),
(5, 'Skills',               'skills/skills.md',                            NULL,                               0),
(6, 'Evaluation',           'evaluation/evaluation.md',                    NULL,                               0),
(7, 'Fine-tuning',          'fine-tuning/fine-tuning.md',                  NULL,                               0),
(8, 'AI Security',          'ai-security/ai-security.md',                  NULL,                               0),
(9, 'Playbooks',            'playbooks/',                                  NULL,                               0);
