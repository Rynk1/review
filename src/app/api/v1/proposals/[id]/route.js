import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse, hasRole } from '@/lib/auth';

/**
 * GET /api/v1/proposals/:id
 * Get proposal details with reviews.
 */
export async function GET(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const sql = getDb();

    const proposals = await sql`
      SELECT p.*, u.full_name as applicant_name, u.email as applicant_email, u.orcid as applicant_orcid
      FROM proposals p
      JOIN users u ON p.applicant_user_id = u.id
      WHERE p.id = ${id} AND p.tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (proposals.length === 0) {
      return errorResponse('Proposal not found', 404, 'NOT_FOUND');
    }

    const proposal = proposals[0];

    // Check access permissions
    if (tokenUser.role === 'applicant' && proposal.applicant_user_id !== tokenUser.user_id) {
      return errorResponse('Access denied', 403, 'FORBIDDEN');
    }

    if (tokenUser.role === 'reviewer') {
      // Check if reviewer is assigned to this proposal
      const assignment = await sql`
        SELECT id FROM reviews
        WHERE proposal_id = ${id} AND reviewer_user_id = ${tokenUser.user_id}
        LIMIT 1
      `;
      if (assignment.length === 0) {
        return errorResponse('Access denied', 403, 'FORBIDDEN');
      }
    }

    // Get reviews (anonymized based on tenant config)
    const tenantConfig = proposal.config || {};
    const isDoubleBlind = tenantConfig.double_blind || false;

    const reviews = await sql`
      SELECT r.id, r.status, r.assigned_at, r.completed_at, r.due_date, r.anonymized,
             u.full_name as reviewer_name, u.email as reviewer_email
      FROM reviews r
      JOIN users u ON r.reviewer_user_id = u.id
      WHERE r.proposal_id = ${id}
      ORDER BY r.assigned_at DESC
    `;

    return NextResponse.json({
      proposal: {
        id: proposal.id,
        title: proposal.title,
        abstract: proposal.abstract,
        keywords: proposal.keywords,
        collaborators: proposal.collaborators,
        attachments: proposal.attachments,
        status: proposal.status,
        submitted_at: proposal.submitted_at,
        created_at: proposal.created_at,
        // Funder Context
        funder_name: proposal.funder_name,
        funding_scheme: proposal.funding_scheme,
        call_reference: proposal.call_reference,
        call_link: proposal.call_link,
        review_panel_type: proposal.review_panel_type,
        discipline: proposal.discipline,
        funding_amount_requested: proposal.funding_amount_requested,
        project_duration_months: proposal.project_duration_months,
        deadline: proposal.deadline,
        funder_country: proposal.funder_country,
        // Proposal Stage
        proposal_stage: proposal.proposal_stage,
        // Research Context
        research_problem: proposal.research_problem,
        current_state_of_the_art: proposal.current_state_of_the_art,
        knowledge_gap: proposal.knowledge_gap,
        research_questions: proposal.research_questions,
        hypotheses: proposal.hypotheses,
        // Methodology
        study_design: proposal.study_design,
        methods: proposal.methods,
        data_sources: proposal.data_sources,
        sample_size: proposal.sample_size,
        analysis_plan: proposal.analysis_plan,
        risk_mitigation: proposal.risk_mitigation,
        // Impact
        expected_scientific_contribution: proposal.expected_scientific_contribution,
        societal_impact: proposal.societal_impact,
        policy_relevance: proposal.policy_relevance,
        innovation_level: proposal.innovation_level,
        // Team
        pi_expertise: proposal.pi_expertise,
        team_track_record: proposal.team_track_record,
        team_collaborators: proposal.team_collaborators,
        previous_grants: proposal.previous_grants,
        // Budget
        total_budget: proposal.total_budget,
        major_cost_categories: proposal.major_cost_categories,
        budget_justification: proposal.budget_justification,
        // Ethics
        ethics_required: proposal.ethics_required,
        human_subjects: proposal.human_subjects,
        animal_research: proposal.animal_research,
        data_protection: proposal.data_protection,
        open_science_plan: proposal.open_science_plan,
        // Feedback
        feedback_priorities: proposal.feedback_priorities,
        applicant: {
          name: proposal.applicant_name,
          email: proposal.applicant_email,
          orcid: proposal.applicant_orcid,
        },
      },
      reviews: reviews.map(r => ({
        id: r.id,
        reviewer_name: (isDoubleBlind || r.anonymized) ? 'Anonymous Reviewer' : r.reviewer_name,
        reviewer_email: (isDoubleBlind || r.anonymized) ? null : r.reviewer_email,
        status: r.status,
        assigned_at: r.assigned_at,
        completed_at: r.completed_at,
        due_date: r.due_date,
      })),
    });
  } catch (error) {
    console.error('GET /api/v1/proposals/[id] error:', error);
    return errorResponse('Failed to fetch proposal', 500, 'SERVER_ERROR');
  }
}

/**
 * PUT /api/v1/proposals/:id
 * Update proposal (owner or manager/admin).
 */
export async function PUT(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const body = await request.json();
    
    // Extract all proposal fields for update
    const {
      title, abstract, keywords, collaborators, attachments, status,
      // Funder Context
      funder_name, funding_scheme, call_reference, call_link,
      review_panel_type, discipline, funding_amount_requested,
      project_duration_months, deadline, funder_country,
      // Proposal Stage
      proposal_stage,
      // Research Context
      research_problem, current_state_of_the_art, knowledge_gap,
      research_questions, hypotheses,
      // Methodology
      study_design, methods, data_sources, sample_size, analysis_plan, risk_mitigation,
      // Impact
      expected_scientific_contribution, societal_impact, policy_relevance, innovation_level,
      // Team
      pi_expertise, team_track_record, team_collaborators, previous_grants,
      // Budget
      total_budget, major_cost_categories, budget_justification,
      // Ethics
      ethics_required, human_subjects, animal_research, data_protection, open_science_plan,
      // Feedback
      feedback_priorities
    } = body;

    const sql = getDb();

    // Get existing proposal
    const proposals = await sql`
      SELECT * FROM proposals
      WHERE id = ${id} AND tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (proposals.length === 0) {
      return errorResponse('Proposal not found', 404, 'NOT_FOUND');
    }

    const proposal = proposals[0];

    // Check permissions
    const isOwner = proposal.applicant_user_id === tokenUser.user_id;
    const isManagerOrAdmin = hasRole(tokenUser, ['manager', 'admin']);

    if (!isOwner && !isManagerOrAdmin) {
      return errorResponse('Access denied', 403, 'FORBIDDEN');
    }

    // Validate status transitions
    if (status) {
      const validTransitions = {
        draft: ['submitted', 'withdrawn'],
        submitted: ['under_review', 'withdrawn', 'accepted', 'rejected'],
        under_review: ['accepted', 'rejected', 'withdrawn'],
        accepted: [],
        rejected: [],
        withdrawn: [],
      };

      const allowed = validTransitions[proposal.status] || [];
      if (!allowed.includes(status)) {
        return errorResponse(
          `Cannot transition from ${proposal.status} to ${status}`,
          400,
          'INVALID_TRANSITION'
        );
      }

      // Only owner can withdraw, only manager/admin can accept/reject
      if (status === 'withdrawn' && !isOwner && !isManagerOrAdmin) {
        return errorResponse('Only the proposal owner can withdraw', 403, 'FORBIDDEN');
      }
      if (['accepted', 'rejected'].includes(status) && !isManagerOrAdmin) {
        return errorResponse('Only managers can accept or reject proposals', 403, 'FORBIDDEN');
      }
    }

    // Build update with all fields
    const updated = await sql`
      UPDATE proposals
      SET
        title = COALESCE(${title || null}, title),
        abstract = COALESCE(${abstract || null}, abstract),
        keywords = COALESCE(${keywords ? keywords : null}::text[], keywords),
        collaborators = COALESCE(${collaborators ? JSON.stringify(collaborators) : null}::jsonb, collaborators),
        status = COALESCE(${status || null}, status),
        -- Funder Context
        funder_name = COALESCE(${funder_name || null}, funder_name),
        funding_scheme = COALESCE(${funding_scheme || null}, funding_scheme),
        call_reference = COALESCE(${call_reference || null}, call_reference),
        call_link = COALESCE(${call_link || null}, call_link),
        review_panel_type = COALESCE(${review_panel_type || null}, review_panel_type),
        discipline = COALESCE(${discipline || null}, discipline),
        funding_amount_requested = COALESCE(${funding_amount_requested || null}, funding_amount_requested),
        project_duration_months = COALESCE(${project_duration_months || null}, project_duration_months),
        deadline = COALESCE(${deadline ? new Date(deadline) : null}, deadline),
        funder_country = COALESCE(${funder_country || null}, funder_country),
        -- Proposal Stage
        proposal_stage = COALESCE(${proposal_stage || null}, proposal_stage),
        -- Research Context
        research_problem = COALESCE(${research_problem || null}, research_problem),
        current_state_of_the_art = COALESCE(${current_state_of_the_art || null}, current_state_of_the_art),
        knowledge_gap = COALESCE(${knowledge_gap || null}, knowledge_gap),
        research_questions = COALESCE(${research_questions || null}, research_questions),
        hypotheses = COALESCE(${hypotheses || null}, hypotheses),
        -- Methodology
        study_design = COALESCE(${study_design || null}, study_design),
        methods = COALESCE(${methods || null}, methods),
        data_sources = COALESCE(${data_sources || null}, data_sources),
        sample_size = COALESCE(${sample_size || null}, sample_size),
        analysis_plan = COALESCE(${analysis_plan || null}, analysis_plan),
        risk_mitigation = COALESCE(${risk_mitigation || null}, risk_mitigation),
        -- Impact
        expected_scientific_contribution = COALESCE(${expected_scientific_contribution || null}, expected_scientific_contribution),
        societal_impact = COALESCE(${societal_impact || null}, societal_impact),
        policy_relevance = COALESCE(${policy_relevance || null}, policy_relevance),
        innovation_level = COALESCE(${innovation_level || null}, innovation_level),
        -- Team
        pi_expertise = COALESCE(${pi_expertise || null}, pi_expertise),
        team_track_record = COALESCE(${team_track_record || null}, team_track_record),
        team_collaborators = COALESCE(${team_collaborators ? JSON.stringify(team_collaborators) : null}::jsonb, team_collaborators),
        previous_grants = COALESCE(${previous_grants ? JSON.stringify(previous_grants) : null}::jsonb, previous_grants),
        -- Budget
        total_budget = COALESCE(${total_budget || null}, total_budget),
        major_cost_categories = COALESCE(${major_cost_categories ? JSON.stringify(major_cost_categories) : null}::jsonb, major_cost_categories),
        budget_justification = COALESCE(${budget_justification || null}, budget_justification),
        -- Ethics
        ethics_required = ${ethics_required !== undefined ? ethics_required : null},
        human_subjects = ${human_subjects !== undefined ? human_subjects : null},
        animal_research = ${animal_research !== undefined ? animal_research : null},
        data_protection = COALESCE(${data_protection || null}, data_protection),
        open_science_plan = COALESCE(${open_science_plan || null}, open_science_plan),
        -- Feedback
        feedback_priorities = COALESCE(${feedback_priorities ? feedback_priorities : null}::text[], feedback_priorities),
        submitted_at = CASE WHEN ${status || null} = 'submitted' THEN now() ELSE submitted_at END
      WHERE id = ${id} AND tenant_id = ${tokenUser.tenant_id}
      RETURNING *
    `;

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: status === 'submitted' ? 'proposal_submitted' : 'proposal_updated',
      resourceType: 'proposal',
      resourceId: id,
      details: { fields_updated: Object.keys(body), new_status: status },
    });

    return NextResponse.json({
      success: true,
      proposal: updated[0],
    });
  } catch (error) {
    console.error('PUT /api/v1/proposals/[id] error:', error);
    return errorResponse('Failed to update proposal', 500, 'SERVER_ERROR');
  }
}

/**
 * DELETE /api/v1/proposals/:id
 * Delete proposal (soft delete - only draft proposals by owner, or admin).
 */
export async function DELETE(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const sql = getDb();

    const proposals = await sql`
      SELECT * FROM proposals
      WHERE id = ${id} AND tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (proposals.length === 0) {
      return errorResponse('Proposal not found', 404, 'NOT_FOUND');
    }

    const proposal = proposals[0];
    const isOwner = proposal.applicant_user_id === tokenUser.user_id;
    const isAdmin = tokenUser.role === 'admin';

    if (!isAdmin && (!isOwner || proposal.status !== 'draft')) {
      return errorResponse(
        'Only draft proposals can be deleted by their owner',
        403,
        'FORBIDDEN'
      );
    }

    // Soft delete by setting status to withdrawn
    await sql`
      UPDATE proposals SET status = 'withdrawn'
      WHERE id = ${id} AND tenant_id = ${tokenUser.tenant_id}
    `;

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'proposal_updated',
      resourceType: 'proposal',
      resourceId: id,
      details: { action: 'deleted', previous_status: proposal.status },
    });

    return NextResponse.json({
      success: true,
      message: 'Proposal deleted',
    });
  } catch (error) {
    console.error('DELETE /api/v1/proposals/[id] error:', error);
    return errorResponse('Failed to delete proposal', 500, 'SERVER_ERROR');
  }
}
