-- ============================================================
-- SEED DATA for Development & Testing
-- ============================================================

-- Tenants
INSERT INTO tenants (id, name, domain, config) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Stanford University', 'stanford.edu', 
   '{"double_blind": false, "cross_tenant_sharing": false, "workload_limit": 5}'),
  ('22222222-2222-2222-2222-222222222222', 'MIT', 'mit.edu', 
   '{"double_blind": true, "cross_tenant_sharing": false, "workload_limit": 4}'),
  ('33333333-3333-3333-3333-333333333333', 'Harvard University', 'harvard.edu', 
   '{"double_blind": false, "cross_tenant_sharing": true, "workload_limit": 6}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STANFORD USERS
-- ============================================================
INSERT INTO users (id, tenant_id, email, full_name, role, orcid) VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'admin@stanford.edu', 'Stanford Admin', 'admin', NULL),
  ('a2222222-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'manager@stanford.edu', 'Stanford Manager', 'manager', NULL),
  ('a3333333-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'reviewer1@stanford.edu', 'Dr. Alice Chen', 'reviewer', '0000-0001-2345-6789'),
  ('a4444444-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'reviewer2@stanford.edu', 'Dr. Bob Martinez', 'reviewer', '0000-0002-3456-7890'),
  ('a5555555-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'applicant@stanford.edu', 'Carol Johnson', 'applicant', NULL)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ============================================================
-- MIT USERS
-- ============================================================
INSERT INTO users (id, tenant_id, email, full_name, role, orcid) VALUES
  ('b1111111-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'admin@mit.edu', 'MIT Admin', 'admin', NULL),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'manager@mit.edu', 'MIT Manager', 'manager', NULL),
  ('b3333333-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'reviewer1@mit.edu', 'Dr. David Kim', 'reviewer', '0000-0003-4567-8901'),
  ('b4444444-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'reviewer2@mit.edu', 'Dr. Emma Wilson', 'reviewer', '0000-0004-5678-9012'),
  ('b5555555-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'applicant@mit.edu', 'Frank Lee', 'applicant', NULL)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ============================================================
-- HARVARD USERS
-- ============================================================
INSERT INTO users (id, tenant_id, email, full_name, role, orcid) VALUES
  ('c1111111-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   'admin@harvard.edu', 'Harvard Admin', 'admin', NULL),
  ('c2222222-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   'manager@harvard.edu', 'Harvard Manager', 'manager', NULL),
  ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   'reviewer1@harvard.edu', 'Dr. Grace Park', 'reviewer', '0000-0005-6789-0123'),
  ('c4444444-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   'reviewer2@harvard.edu', 'Dr. Henry Brown', 'reviewer', '0000-0006-7890-1234'),
  ('c5555555-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   'applicant@harvard.edu', 'Iris Davis', 'applicant', NULL)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ============================================================
-- REVIEWER PROFILES - Stanford
-- ============================================================
INSERT INTO reviewer_profiles (user_id, tenant_id, expertise, areas, publications, workload_limit, current_assignments, opt_in) VALUES
  ('a3333333-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   ARRAY['machine learning', 'deep learning', 'computer vision', 'neural networks'],
   '{"subjects": ["Computer Science", "Artificial Intelligence"], "methods": ["Deep Learning", "Convolutional Networks"], "disciplines": ["Engineering", "Data Science"]}',
   '[{"title": "Advances in Deep Learning for Medical Imaging", "doi": "10.1234/dl-med-2023", "year": 2023, "authors": ["Alice Chen", "John Smith"], "journal": "Nature Machine Intelligence"}, {"title": "Self-supervised Learning in Computer Vision", "doi": "10.1234/ssl-cv-2022", "year": 2022, "authors": ["Alice Chen", "Mary Johnson"], "journal": "CVPR 2022"}]',
   5, 1, true),
  ('a4444444-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   ARRAY['natural language processing', 'text mining', 'information retrieval', 'knowledge graphs'],
   '{"subjects": ["Computer Science", "Linguistics"], "methods": ["Transformer Models", "Named Entity Recognition"], "disciplines": ["Engineering", "Computational Linguistics"]}',
   '[{"title": "Large Language Models for Scientific Text Analysis", "doi": "10.1234/llm-sci-2024", "year": 2024, "authors": ["Bob Martinez", "Sarah Lee"], "journal": "ACL 2024"}, {"title": "Knowledge Graph Construction from Scientific Literature", "doi": "10.1234/kg-sci-2023", "year": 2023, "authors": ["Bob Martinez"], "journal": "EMNLP 2023"}]',
   5, 2, true)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- REVIEWER PROFILES - MIT
-- ============================================================
INSERT INTO reviewer_profiles (user_id, tenant_id, expertise, areas, publications, workload_limit, current_assignments, opt_in) VALUES
  ('b3333333-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   ARRAY['quantum computing', 'quantum algorithms', 'cryptography', 'complexity theory'],
   '{"subjects": ["Computer Science", "Physics"], "methods": ["Quantum Circuits", "Error Correction"], "disciplines": ["Engineering", "Physics"]}',
   '[{"title": "Quantum Error Correction at Scale", "doi": "10.1234/qec-2024", "year": 2024, "authors": ["David Kim", "Lisa Wang"], "journal": "Physical Review Letters"}, {"title": "Variational Quantum Algorithms for Optimization", "doi": "10.1234/vqa-2023", "year": 2023, "authors": ["David Kim"], "journal": "Nature Physics"}]',
   4, 0, true),
  ('b4444444-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   ARRAY['robotics', 'autonomous systems', 'control theory', 'human-robot interaction'],
   '{"subjects": ["Robotics", "Mechanical Engineering"], "methods": ["Reinforcement Learning", "Motion Planning"], "disciplines": ["Engineering", "Cognitive Science"]}',
   '[{"title": "Safe Reinforcement Learning for Robotic Manipulation", "doi": "10.1234/rl-robot-2024", "year": 2024, "authors": ["Emma Wilson", "Tom Chen"], "journal": "ICRA 2024"}]',
   4, 1, true)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- REVIEWER PROFILES - Harvard
-- ============================================================
INSERT INTO reviewer_profiles (user_id, tenant_id, expertise, areas, publications, workload_limit, current_assignments, opt_in) VALUES
  ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   ARRAY['bioinformatics', 'genomics', 'computational biology', 'systems biology'],
   '{"subjects": ["Biology", "Computer Science"], "methods": ["Sequence Analysis", "Network Analysis"], "disciplines": ["Life Sciences", "Data Science"]}',
   '[{"title": "Multi-omics Integration for Disease Prediction", "doi": "10.1234/omics-2024", "year": 2024, "authors": ["Grace Park", "James Liu"], "journal": "Nature Methods"}, {"title": "Single-cell RNA Sequencing Analysis Pipeline", "doi": "10.1234/scrna-2023", "year": 2023, "authors": ["Grace Park"], "journal": "Genome Biology"}]',
   6, 0, true),
  ('c4444444-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   ARRAY['climate science', 'environmental modeling', 'remote sensing', 'sustainability'],
   '{"subjects": ["Environmental Science", "Earth Science"], "methods": ["Climate Modeling", "Satellite Data Analysis"], "disciplines": ["Environmental Studies", "Data Science"]}',
   '[{"title": "Machine Learning for Climate Downscaling", "doi": "10.1234/ml-climate-2024", "year": 2024, "authors": ["Henry Brown", "Anna White"], "journal": "Nature Climate Change"}]',
   6, 2, true)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- SAMPLE PROPOSALS - Stanford
-- ============================================================
INSERT INTO proposals (id, tenant_id, applicant_user_id, title, abstract, keywords, collaborators, status, submitted_at) VALUES
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'a5555555-1111-1111-1111-111111111111',
   'Deep Learning Approaches for Early Cancer Detection in Medical Imaging',
   'This proposal presents a novel deep learning framework for early-stage cancer detection using multi-modal medical imaging data. We propose a transformer-based architecture that integrates CT, MRI, and PET scan data to improve detection accuracy by 25% over current state-of-the-art methods. The system will be validated on a dataset of 50,000 patient records from three major hospitals.',
   ARRAY['deep learning', 'medical imaging', 'cancer detection', 'transformer', 'computer vision'],
   '[{"name": "Dr. Michael Torres", "email": "m.torres@hospital.org", "orcid": "0000-0007-1234-5678", "affiliation": "Stanford Medical Center", "role": "Co-Investigator"}]',
   'submitted',
   now() - interval '2 days'),
  ('d2222222-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'a5555555-1111-1111-1111-111111111111',
   'Natural Language Processing for Automated Scientific Literature Review',
   'We propose an automated system for systematic literature review using large language models. The system will extract key findings, methodologies, and conclusions from scientific papers, enabling researchers to process thousands of papers in hours rather than months.',
   ARRAY['natural language processing', 'literature review', 'large language models', 'information extraction'],
   '[]',
   'draft',
   now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SAMPLE PROPOSALS - MIT
-- ============================================================
INSERT INTO proposals (id, tenant_id, applicant_user_id, title, abstract, keywords, collaborators, status, submitted_at) VALUES
  ('d3333333-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'b5555555-2222-2222-2222-222222222222',
   'Quantum-Classical Hybrid Algorithms for Drug Discovery',
   'This research proposes novel quantum-classical hybrid algorithms for molecular simulation in drug discovery. By leveraging quantum computing for electronic structure calculations and classical ML for property prediction, we aim to reduce drug discovery timelines by 40%.',
   ARRAY['quantum computing', 'drug discovery', 'molecular simulation', 'hybrid algorithms'],
   '[]',
   'submitted',
   now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SAMPLE REVIEWS
-- ============================================================
INSERT INTO reviews (id, tenant_id, proposal_id, reviewer_user_id, status, due_date) VALUES
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'd1111111-1111-1111-1111-111111111111', 'a3333333-1111-1111-1111-111111111111',
   'accepted', now() + interval '14 days'),
  ('e2222222-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'd1111111-1111-1111-1111-111111111111', 'a4444444-1111-1111-1111-111111111111',
   'assigned', now() + interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- Update proposal status to under_review since reviewers are assigned
UPDATE proposals SET status = 'under_review' 
WHERE id = 'd1111111-1111-1111-1111-111111111111';
