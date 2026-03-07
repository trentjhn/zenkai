"""
Content generation prompts for the Zenkai pipeline.

Prompt naming follows the design doc:
  1a — default layer (hook + explanation + analogy)
  1b — deep layer (mechanism + edge cases + key number + failure story)
  1c — prediction question (shown BEFORE the explanation)
  1d — worked annotated example
  3  — multiple choice quiz questions (3 per concept)
  4  — scenario-based PM quiz questions (3 per concept)
  5  — module cheatsheet
"""


def prompt_1a(concept_title: str, kb_section: str, pm_context: str = "") -> str:
    pm_block = f"\n\nPM Context:\n{pm_context}" if pm_context else ""
    return f"""You are generating structured learning content for an AI education app.

Source material:
{kb_section}{pm_block}

Generate a JSON object for the concept "{concept_title}" with this exact structure:
{{
  "title": "concept name",
  "hook": "1-2 sentences on why this matters — what problem it solves or what breaks without it",
  "explanation": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "analogy": "one concrete analogy to a familiar concept, or null if none fits"
}}

Rules:
- explanation array: 2-4 paragraphs, plain English, build from basic to nuanced
- hook must create genuine curiosity — not "this is important because"
- analogy must be concrete and accurate, not vague
- total explanation word count: 150-250 words"""


def prompt_1b(concept_title: str, kb_section: str) -> str:
    return f"""Generate a deep-dive JSON object for the concept "{concept_title}".

Source material:
{kb_section}

Return JSON with this structure:
{{
  "mechanism": ["step 1", "step 2", "step 3"],
  "edge_cases": ["edge case 1", "edge case 2"],
  "key_number": "one specific empirical finding or threshold (e.g., '78.7% vs 17.7% accuracy')",
  "failure_story": "3-4 sentence story of a real or realistic failure caused by misunderstanding this concept"
}}

Rules:
- mechanism: the actual internal steps/logic — not a re-summary of the explanation
- edge_cases: 2-3 specific situations where the normal understanding breaks down
- key_number: must be a real research finding or widely-cited benchmark from the source material
- failure_story: a specific, vivid story — not generic advice"""


def prompt_1c(concept_title: str, kb_section: str) -> str:
    return f"""Generate a prediction question for "{concept_title}" — shown BEFORE the explanation to prime the learner's thinking.

Source material (first 40 lines only):
{kb_section[:2000]}

Return JSON:
{{
  "question": "question text",
  "options": ["A", "B", "C", "D"],
  "correct_index": 0,
  "reveal_explanation": "why the correct answer is right, in 1-2 sentences shown after the full explanation"
}}

Rules:
- The question tests intuition, not memorization — the learner probably can't answer it yet
- Wrong answers should be plausible, not obviously wrong
- Do not spoil the explanation — this appears BEFORE it loads"""


def prompt_1d(concept_title: str, kb_section: str) -> str:
    return f"""Generate a worked annotated example for the concept "{concept_title}".

Source material:
{kb_section}

Return JSON:
{{
  "artifact_type": "prompt | architecture_diagram | code_snippet | comparison",
  "artifact": "the actual example text/content — a real prompt, diagram description, or code",
  "annotations": [
    {{"reference": "exact phrase from artifact", "explanation": "why this part demonstrates the concept"}}
  ]
}}

Rules:
- artifact must be a real, usable example — not a placeholder or generic template
- 2-4 annotations pointing to specific parts of the artifact
- each annotation explains WHY, not just WHAT"""


def prompt_3(concept_title: str, kb_section: str, pm_scenarios: str = "") -> str:
    pm_block = f"\n\nPM scenario context:\n{pm_scenarios}" if pm_scenarios else ""
    return f"""Generate 3 multiple choice quiz questions for "{concept_title}".

Source material:
{kb_section}{pm_block}

Return a JSON array of 3 objects:
[
  {{
    "type": "comprehension | application | tradeoff",
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "why the correct answer is right and why the most tempting wrong answer is wrong"
  }}
]

Rules:
- one comprehension question, one application question, one tradeoff question
- wrong answers represent real misconceptions, not obviously wrong noise
- application and tradeoff questions are scenario-based: "You are building X and Y happens. What do you do?"
- explanation is part of the learning — make it substantive"""


def prompt_4(concept_title: str, kb_section: str, pm_scenarios: str) -> str:
    return f"""Generate 3 scenario-based quiz questions for "{concept_title}" from an AI PM perspective.

Source material:
{kb_section}

PM scenario context:
{pm_scenarios}

Return a JSON array of 3 objects:
[
  {{
    "type": "scenario",
    "scenario_type": "system_design | production_failure | risk_communication",
    "scenario": "2-3 sentence situation description",
    "question": "what do you do / what's the problem / how do you respond",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "what the correct choice reveals about understanding this concept"
  }}
]

Rules:
- one of each scenario_type
- all options must be plausible PM responses — no obviously wrong answers
- scenario must name real stakes (launch decision, incident response, exec presentation)"""


def prompt_5(module_title: str, concepts_summary: str) -> str:
    return f"""Generate a cheatsheet for the module "{module_title}".

Concepts covered:
{concepts_summary}

Return JSON:
{{
  "module": "module title",
  "key_concepts": [
    {{"term": "concept name", "one_liner": "10-15 word definition", "remember": "the one thing to never forget"}}
  ],
  "mental_model": "1 sentence that ties all concepts together",
  "watch_out_for": ["common mistake 1", "common mistake 2", "common mistake 3"]
}}"""
