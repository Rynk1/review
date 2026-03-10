-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  domain text,
  config jsonb DEFAULT '{"double_blind": false, "cross_tenant_sharing": false, "workload_limit": 5}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  email text NOT NULL,
  full_name text,
  orcid text UNIQUE,
  role text NOT NULL CHECK (role IN ('applicant','reviewer','manager','admin')),
  sso_subject text,
  metadata jsonb DEFAULT '{}',
  encrypted_pii text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_orcid ON users(orcid) WHERE orcid IS NOT NULL;

-- ============================================================
-- REVIEWER PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviewer_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) UNIQUE,
  tenant_id uuid REFERENCES tenants(id),
  expertise text[] DEFAULT '{}',
  areas jsonb DEFAULT '{"subjects": [], "methods": [], "disciplines": []}',
  publications jsonb DEFAULT '[]',
  availability jsonb DEFAULT '{"weekly_hours": 10, "blackout_dates": []}',
  workload_limit int DEFAULT 5,
  current_assignments int DEFAULT 0,
  opt_in boolean DEFAULT true,
  bias_score real DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviewer_profiles_tenant_id ON reviewer_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_profiles_opt_in ON reviewer_profiles(opt_in);
CREATE INDEX IF NOT EXISTS idx_reviewer_profiles_expertise ON reviewer_profiles USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_reviewer_profiles_areas ON reviewer_profiles USING GIN(areas);
CREATE INDEX IF NOT EXISTS idx_reviewer_profiles_publications ON reviewer_profiles USING GIN(publications);

-- ============================================================
-- PROPOSALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id),
  applicant_user_id uuid REFERENCES users(id),
  title text NOT NULL,
  abstract text,
  keywords text[] DEFAULT '{}',
  collaborators jsonb DEFAULT '[]',
  attachments jsonb DEFAULT '[]',
  submitted_at timestamptz DEFAULT now(),
  status text DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','accepted','rejected','withdrawn')),
  metadata jsonb DEFAULT '{}',
  embedding_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_applicant ON proposals(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_submitted ON proposals(submitted_at);
CREATE INDEX IF NOT EXISTS idx_proposals_fts ON proposals USING GIN(to_tsvector('english', title || ' ' || COALESCE(abstract, '')));
CREATE INDEX IF NOT EXISTS idx_proposals_keywords ON proposals USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_proposals_collaborators ON proposals USING GIN(collaborators);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id),
  proposal_id uuid REFERENCES proposals(id),
  reviewer_user_id uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  due_date timestamptz,
  scores jsonb DEFAULT '{}',
  comments text,
  anonymized boolean DEFAULT false,
  conflict_declared boolean DEFAULT false,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','declined','in_progress','completed','cancelled')),
  audit jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_proposal_id ON reviews(proposal_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- ============================================================
-- CONFLICT FLAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS conflict_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id),
  proposal_id uuid REFERENCES proposals(id),
  reviewer_user_id uuid REFERENCES users(id),
  conflict_type text NOT NULL CHECK (conflict_type IN ('institution','coauthorship','collaboration','declared','other')),
  reason text,
  confidence_score real DEFAULT 0.0,
  evidence jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conflict_flags_proposal_reviewer ON conflict_flags(proposal_id, reviewer_user_id);

-- ============================================================
-- REVIEWER MATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviewer_matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id),
  proposal_id uuid REFERENCES proposals(id),
  reviewer_user_id uuid REFERENCES users(id),
  relevance_score real NOT NULL,
  conflict_score real NOT NULL,
  bias_penalty real DEFAULT 0.0,
  final_score real NOT NULL,
  reasoning jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviewer_matches_proposal ON reviewer_matches(proposal_id);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON audit_logs(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  sent boolean DEFAULT false,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviewer_profiles_updated_at BEFORE UPDATE ON reviewer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
