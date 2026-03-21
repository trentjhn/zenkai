-- Migration: Fix kb_source_path values for all modules
-- These values were missing their subdirectory prefix and would cause the
-- content pipeline to fail when trying to resolve the KB file paths.

UPDATE modules
SET kb_source_path = 'LEARNING/FOUNDATIONS/prompt-engineering/prompt-engineering.md'
WHERE title = 'Prompt Engineering';

UPDATE modules
SET kb_source_path = 'LEARNING/FOUNDATIONS/context-engineering/context-engineering.md'
WHERE title = 'Context Engineering';

UPDATE modules
SET kb_source_path = 'LEARNING/FOUNDATIONS/reasoning-llms/reasoning-llms.md'
WHERE title = 'Reasoning LLMs';

UPDATE modules
SET kb_source_path = 'LEARNING/AGENTS_AND_SYSTEMS/agentic-engineering/agentic-engineering.md'
WHERE title = 'Agentic Engineering';

UPDATE modules
SET kb_source_path = 'LEARNING/AGENTS_AND_SYSTEMS/skills/skills.md'
WHERE title = 'Skills';

UPDATE modules
SET kb_source_path = 'LEARNING/PRODUCTION/evaluation/evaluation.md'
WHERE title = 'Evaluation';

UPDATE modules
SET kb_source_path = 'LEARNING/PRODUCTION/fine-tuning/fine-tuning.md'
WHERE title = 'Fine-tuning';

UPDATE modules
SET kb_source_path = 'LEARNING/PRODUCTION/ai-security/ai-security.md'
WHERE title = 'AI Security';

UPDATE modules
SET kb_source_path = 'future-reference/playbooks/'
WHERE title = 'Playbooks';
