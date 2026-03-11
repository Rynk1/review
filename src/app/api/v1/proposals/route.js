import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse } from '@/lib/auth';

/**
 * GET /api/v1/proposals
 * List proposals with filtering and pagination.
 * - applicant: own proposals only
 * - reviewer: assigned proposals only
 * - manager/admin: all tenant proposals
 */
export async function GET(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const sql = getDb();

    let proposals;
    let total;

    if (tokenUser.role === 'applicant') {
      // Applicants see only their own proposals
      if (search) {
        proposals = await sql`
          SELECT p.*, u.full_name as applicant_name, u.email as applicant_email,
                 COUNT(r.id) as review_count
          FROM proposals p
          JOIN users u ON p.applicant_user_id = u.id
          LEFT JOIN reviews r ON r.proposal_id = p.id AND r.status NOT IN ('cancelled', 'declined')
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND p.applicant_user_id = ${tokenUser.user_id}
            AND (${status || null} IS NULL OR p.status = ${status})
            AND to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '')) @@ plainto_tsquery('english', ${search})
          GROUP BY p.id, u.full_name, u.email
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM proposals p
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND p.applicant_user_id = ${tokenUser.user_id}
            AND (${status || null} IS NULL OR p.status = ${status})
            AND to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '')) @@ plainto_tsquery('english', ${search})
        `;
        total = parseInt(countResult[0].count);
      } else {
        proposals = await sql`
          SELECT p.*, u.full_name as applicant_name, u.email as applicant_email,
                 COUNT(r.id) as review_count
          FROM proposals p
          JOIN users u ON p.applicant_user_id = u.id
          LEFT JOIN reviews r ON r.proposal_id = p.id AND r.status NOT IN ('cancelled', 'declined')
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND p.applicant_user_id = ${tokenUser.user_id}
            AND (${status || null} IS NULL OR p.status = ${status})
          GROUP BY p.id, u.full_name, u.email
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM proposals p
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND p.applicant_user_id = ${tokenUser.user_id}
            AND (${status || null} IS NULL OR p.status = ${status})
        `;
        total = parseInt(countResult[0].count);
      }
    } else if (tokenUser.role === 'reviewer') {
      // Reviewers see only assigned proposals
      proposals = await sql`
        SELECT DISTINCT p.*, u.full_name as applicant_name, u.email as applicant_email,
               COUNT(r2.id) as review_count
        FROM proposals p
        JOIN users u ON p.applicant_user_id = u.id
        JOIN reviews r ON r.proposal_id = p.id AND r.reviewer_user_id = ${tokenUser.user_id}
        LEFT JOIN reviews r2 ON r2.proposal_id = p.id AND r2.status NOT IN ('cancelled', 'declined')
        WHERE p.tenant_id = ${tokenUser.tenant_id}
          AND (${status || null} IS NULL OR p.status = ${status})
        GROUP BY p.id, u.full_name, u.email
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(DISTINCT p.id) as count
        FROM proposals p
        JOIN reviews r ON r.proposal_id = p.id AND r.reviewer_user_id = ${tokenUser.user_id}
        WHERE p.tenant_id = ${tokenUser.tenant_id}
          AND (${status || null} IS NULL OR p.status = ${status})
      `;
      total = parseInt(countResult[0].count);
    } else {
      // Manager/admin see all tenant proposals
      if (search) {
        proposals = await sql`
          SELECT p.*, u.full_name as applicant_name, u.email as applicant_email,
                 COUNT(r.id) as review_count
          FROM proposals p
          JOIN users u ON p.applicant_user_id = u.id
          LEFT JOIN reviews r ON r.proposal_id = p.id AND r.status NOT IN ('cancelled', 'declined')
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND (${status || null} IS NULL OR p.status = ${status})
            AND to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '')) @@ plainto_tsquery('english', ${search})
          GROUP BY p.id, u.full_name, u.email
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM proposals p
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND (${status || null} IS NULL OR p.status = ${status})
            AND to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '')) @@ plainto_tsquery('english', ${search})
        `;
        total = parseInt(countResult[0].count);
      } else {
        proposals = await sql`
          SELECT p.*, u.full_name as applicant_name, u.email as applicant_email,
                 COUNT(r.id) as review_count
          FROM proposals p
          JOIN users u ON p.applicant_user_id = u.id
          LEFT JOIN reviews r ON r.proposal_id = p.id AND r.status NOT IN ('cancelled', 'declined')
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND (${status || null} IS NULL OR p.status = ${status})
          GROUP BY p.id, u.full_name, u.email
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM proposals p
          WHERE p.tenant_id = ${tokenUser.tenant_id}
            AND (${status || null} IS NULL OR p.status = ${status})
        `;
        total = parseInt(countResult[0].count);
      }
    }

    return NextResponse.json({
      proposals: proposals.map(p => ({
        id: p.id,
        title: p.title,
        abstract: p.abstract,
        keywords: p.keywords,
        status: p.status,
        funder_name: p.funder_name,
        funding_scheme: p.funding_scheme,
        proposal_stage: p.proposal_stage,
        discipline: p.discipline,
        funding_amount_requested: p.funding_amount_requested,
        deadline: p.deadline,
        applicant_name: p.applicant_name,
        applicant_email: p.applicant_email,
        review_count: parseInt(p.review_count || 0),
        submitted_at: p.submitted_at,
        created_at: p.created_at,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/v1/proposals error:', error);
    return errorResponse('Failed to fetch proposals', 500, 'SERVER_ERROR');
  }
}

/**
 * POST /api/v1/proposals
 * Create a new proposal.
 */
export async function POST(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const body = await request.json();
    
    // Extract all proposal fields
    const {
      title, abstract, keywords, collaborators, attachments,
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

    if (!title || !abstract) {
      return errorResponse('title and abstract are required', 400, 'INVALID_INPUT');
    }

    const sql = getDb();

    const proposals = await sql`
      INSERT INTO proposals (
        tenant_id, applicant_user_id, title, abstract, keywords, collaborators, attachments,
        -- Funder Context
        funder_name, funding_scheme, call_reference, call_link, review_panel_type,
        discipline, funding_amount_requested, project_duration_months, deadline, funder_country,
        -- Proposal Stage
        proposal_stage,
        -- Research Context
        research_problem, current_state_of_the_art, knowledge_gap, research_questions, hypotheses,
        -- Methodology
        study_design, methods, data_sources, sample_size, analysis_plan, risk_mitigation,
        -- Impact
        expected_scientific_contribution, societal_impact, policy_relevance, innovation_level,
        -- Team
        pi_expertise, team_track_record, team_collaborators, previous_grants,
        -- Budget
        total_budget, major_cost_categories, budget_justification,
        -- Ethics
        ethics_required, human_subjects, animal_research, data_protection, open_science_plan,
        -- Feedback
        feedback_priorities,
        status
      ) VALUES (
        ${tokenUser.tenant_id},
        ${tokenUser.user_id},
        ${title},
        ${abstract},
        ${keywords || []}::text[],
        ${JSON.stringify(collaborators || [])}::jsonb,
        ${JSON.stringify(attachments || [])}::jsonb,
        -- Funder Context
        ${funder_name || null},
        ${funding_scheme || null},
        ${call_reference || null},
        ${call_link || null},
        ${review_panel_type || null},
        ${discipline || null},
        ${funding_amount_requested || null},
        ${project_duration_months || null},
        ${deadline ? new Date(deadline) : null},
        ${funder_country || null},
        -- Proposal Stage
        ${proposal_stage || null},
        -- Research Context
        ${research_problem || null},
        ${current_state_of_the_art || null},
        ${knowledge_gap || null},
        ${research_questions || null},
        ${hypotheses || null},
        -- Methodology
        ${study_design || null},
        ${methods || null},
        ${data_sources || null},
        ${sample_size || null},
        ${analysis_plan || null},
        ${risk_mitigation || null},
        -- Impact
        ${expected_scientific_contribution || null},
        ${societal_impact || null},
        ${policy_relevance || null},
        ${innovation_level || null},
        -- Team
        ${pi_expertise || null},
        ${team_track_record || null},
        ${JSON.stringify(team_collaborators || [])},
        ${JSON.stringify(previous_grants || [])},
        -- Budget
        ${total_budget || null},
        ${JSON.stringify(major_cost_categories || [])},
        ${budget_justification || null},
        -- Ethics
        ${ethics_required || false},
        ${human_subjects || false},
        ${animal_research || false},
        ${data_protection || null},
        ${open_science_plan || null},
        -- Feedback
        ${feedback_priorities || []}::text[],
        'draft'
      )
      RETURNING *
    `;

    const proposal = proposals[0];

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'proposal_created',
      resourceType: 'proposal',
      resourceId: proposal.id,
      details: { title },
    });

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        created_at: proposal.created_at,
      },
    });
  } catch (error) {
    console.error('POST /api/v1/proposals error:', error);
    return errorResponse('Failed to create proposal', 500, 'SERVER_ERROR');
  }
}
