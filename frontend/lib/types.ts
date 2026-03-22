export interface Module {
  id: number
  order_index: number
  title: string
  is_unlocked: boolean
  quiz_score_achieved: number | null
}

export interface Concept {
  id: number
  module_id: number
  order_index: number
  title: string
  default_layer: DefaultLayer
  deep_layer: DeepLayer
  prediction_question: PredictionQuestion
  worked_example: WorkedExample
  content_hash: string
}

export interface DefaultLayer {
  title: string
  hook: string
  explanation: string[]
  analogy: string | null
}

export interface DeepLayer {
  mechanism: string[]
  edge_cases: string[]
  key_number: string
  failure_story: string
}

export interface PredictionQuestion {
  question: string
  options: string[]
  correct_index: number
  reveal_explanation: string
}

export interface WorkedExample {
  artifact_type: "prompt" | "architecture_diagram" | "code_snippet" | "comparison"
  artifact: string
  annotations: Array<{ reference: string; explanation: string }>
}

export interface ModuleDetail extends Module {
  concepts: Pick<Concept, "id" | "order_index" | "title">[]
}

export interface Character {
  id: number
  username: string
  character_form: number
  total_xp: number
  current_streak: number
  longest_streak: number
  equipment: Array<{ slot: string; item_name: string; item_type: string }>
}

export interface ProgressPayload {
  user_id: number
  concept_id: number
  answered_correctly: boolean
  confidence: "knew_it" | "somewhat_sure" | "guessed"
  time_spent_ms: number
}

export interface ProgressResponse {
  interval_days: number
  ease_factor: number
  repetitions: number
  next_review_at: string
}

export interface ReviewItem {
  concept_id: number
  next_review_at: string
  interval_days: number
  title: string
  module_id: number
}

export interface CompleteResponse {
  score: number | null
  next_module_id: number | null
  next_module_unlocked: boolean
}
