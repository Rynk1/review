-- ============================================================
-- Migration: 002_enhanced_proposal_fields
-- Description: Add comprehensive proposal fields for robust grant applications
-- ============================================================

-- ============================================================
-- ADD PROPOSAL FIELDS
-- ============================================================

-- 1. Funder Context
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS funder_name text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS funding_scheme text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS call_reference text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS call_link text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS review_panel_type text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS discipline text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS funding_amount_requested numeric(15,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS project_duration_months int;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS funder_country text;

-- 2. Proposal Stage
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_stage text CHECK (proposal_stage IS NULL OR proposal_stage IN ('concept','outline','near-final','final'));

-- 3. Research Context
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS research_problem text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS current_state_of_the_art text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS knowledge_gap text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS research_questions text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS hypotheses text;

-- 4. Methodology
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS study_design text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS methods text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS data_sources text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sample_size text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS analysis_plan text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS risk_mitigation text;

-- 5. Impact and Significance
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS expected_scientific_contribution text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS societal_impact text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS policy_relevance text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS innovation_level text;

-- 6. Team Information
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pi_expertise text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS team_track_record text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS team_collaborators jsonb DEFAULT '[]';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS previous_grants jsonb DEFAULT '[]';

-- 7. Budget Summary
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_budget numeric(15,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS major_cost_categories jsonb DEFAULT '[]';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS budget_justification text;

-- 8. Ethical & Compliance Issues
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS ethics_required boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS human_subjects boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS animal_research boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS data_protection text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS open_science_plan text;

-- 9. Specific Feedback Requests
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS feedback_priorities text[] DEFAULT '{}';

-- ============================================================
-- CREATE INDEXES FOR NEW FIELDS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_proposals_funder_name ON proposals(funder_name);
CREATE INDEX IF NOT EXISTS idx_proposals_funding_scheme ON proposals(funding_scheme);
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_stage ON proposals(proposal_stage);
CREATE INDEX IF NOT EXISTS idx_proposals_discipline ON proposals(discipline);
CREATE INDEX IF NOT EXISTS idx_proposals_deadline ON proposals(deadline);
CREATE INDEX IF NOT EXISTS idx_proposals_innovation_level ON proposals(innovation_level);
CREATE INDEX IF NOT EXISTS idx_proposals_feedback_priorities ON proposals USING GIN(feedback_priorities);

-- ============================================================
-- UPDATE embedding_text FOR FULL-TEXT SEARCH
-- ============================================================

-- Create function to update embedding_text with new fields
CREATE OR REPLACE FUNCTION update_proposal_embedding_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.embedding_text := 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.abstract, '') || ' ' ||
    COALESCE(NEW.funder_name, '') || ' ' ||
    COALESCE(NEW.funding_scheme, '') || ' ' ||
    COALESCE(NEW.discipline, '') || ' ' ||
    COALESCE(NEW.research_problem, '') || ' ' ||
    COALESCE(NEW.current_state_of_the_art, '') || ' ' ||
    COALESCE(NEW.knowledge_gap, '') || ' ' ||
    COALESCE(NEW.methodology, '') || ' ' ||
    COALESCE(NEW.expected_scientific_contribution, '') || ' ' ||
    COALESCE(NEW.societal_impact, '') || ' ' ||
    COALESCE(NEW.innovation_level, '') || ' ' ||
    COALESCE(array_to_string(NEW.keywords, ' '), '');
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger with new function
DROP TRIGGER IF EXISTS update_proposals_embedding ON proposals;
CREATE TRIGGER update_proposals_embedding
  BEFORE INSERT OR UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_embedding_text();

-- Update existing proposals
UPDATE proposals SET embedding_text = 
  COALESCE(title, '') || ' ' ||
  COALESCE(abstract, '') || ' ' ||
  COALESCE(funder_name, '') || ' ' ||
  COALESCE(funding_scheme, '') || ' ' ||
  COALESCE(discipline, '') || ' ' ||
  COALESCE(research_problem, '') || ' ' ||
  COALESCE(current_state_of_the_art, '') || ' ' ||
  COALESCE(knowledge_gap, '') || ' ' ||
  COALESCE(methodology, '') || ' ' ||
  COALESCE(expected_scientific_contribution, '') || ' ' ||
  COALESCE(societal_impact, '') || ' ' ||
  COALESCE(innovation_level, '') || ' ' ||
  COALESCE(array_to_string(keywords, ' '), '')
WHERE embedding_text IS NULL;

-- ============================================================
-- UPDATE UPDATED_AT TRIGGER
-- ============================================================

-- Ensure updated_at is automatically updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';
