import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse, hasRole } from '@/lib/auth';
import { runMatchingAlgorithm, generateConflictFlag } from '@/lib/matching';

/**
 * POST /api/v1/proposals/:id/matching
 * Generate reviewer matches for a proposal.
 */
export async function POST(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!hasRole(tokenUser, ['manager', 'admin'])) {
    return errorResponse('Insufficient permissions', 403, 'FORBIDDEN');
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const topN = body.top_n || 10;
    const forceRefresh = body.force_refresh || false;

    const sql = getDb();

    // Get proposal
    const proposals = await sql`
      SELECT * FROM proposals
      WHERE id = ${id} AND tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (proposals.length === 0) {
      return errorResponse('Proposal not found', 404, 'NOT_FOUND');
    }

    const proposal = proposals[0];

    // Check for cached matches
    if (!forceRefresh) {
      const cached = await sql`
        SELECT rm.*, u.full_name as reviewer_name, u.email as reviewer_email,
               rp.expertise, rp.current_assignments, rp.workload_limit
        FROM reviewer_matches rm
        JOIN users u ON rm.reviewer_user_id = u.id
        JOIN reviewer_profiles rp ON rp.user_id = u.id
        WHERE rm.proposal_id = ${id}
        ORDER BY rm.final_score DESC
        LIMIT ${topN}
      `;

      if (cached.length > 0) {
        return NextResponse.json({
          success: true,
          matches: cached.map(m => ({
            id: m.id,
            reviewer_id: m.reviewer_user_id,
            reviewer_name: m.reviewer_name,
            reviewer_email: m.reviewer_email,
            expertise: m.expertise,
            relevance_score: m.relevance_score,
            conflict_score: m.conflict_score,
            bias_penalty: m.bias_penalty,
            final_score: m.final_score,
            reasoning: m.reasoning,
            current_assignments: m.current_assignments,
            workload_limit: m.workload_limit,
          })),
          cached: true,
        });
      }
    }

    // Get candidate reviewers from same tenant
    const reviewers = await sql`
      SELECT rp.*, u.email, u.orcid, u.full_name, u.id as user_id
      FROM reviewer_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.tenant_id = ${tokenUser.tenant_id}
        AND rp.opt_in = true
        AND rp.current_assignments < rp.workload_limit
        AND u.id != ${proposal.applicant_user_id}
    `;

    // Run matching algorithm
    const matches = runMatchingAlgorithm(proposal, reviewers, topN);

    // Clear old matches if force refresh
    if (forceRefresh) {
      await sql`DELETE FROM reviewer_matches WHERE proposal_id = ${id}`;
    }

    // Store matches in database
    const storedMatches = [];
    for (const match of matches) {
      const stored = await sql`
        INSERT INTO reviewer_matches (
          tenant_id, proposal_id, reviewer_user_id,
          relevance_score, conflict_score, bias_penalty, final_score, reasoning
        ) VALUES (
          ${tokenUser.tenant_id},
          ${id},
          ${match.reviewer_id},
          ${match.relevance_score},
          ${match.conflict_score},
          ${match.bias_penalty},
          ${match.final_score},
          ${JSON.stringify(match.reasoning)}::jsonb
        )
        ON CONFLICT (proposal_id, reviewer_user_id) DO UPDATE SET
          relevance_score = EXCLUDED.relevance_score,
          conflict_score = EXCLUDED.conflict_score,
          bias_penalty = EXCLUDED.bias_penalty,
          final_score = EXCLUDED.final_score,
          reasoning = EXCLUDED.reasoning,
          created_at = now()
        RETURNING id
      `;
      storedMatches.push({ ...match, id: stored[0].id });
    }

    // Generate conflict flags for high-conflict reviewers (not in top matches)
    for (const reviewer of reviewers) {
      const conflictScore = matches.find(m => m.reviewer_id === reviewer.user_id)?.conflict_score;
      if (conflictScore === undefined) {
        // This reviewer was skipped due to high conflict - generate flag
        const { calculateConflictScore } = await import('@/lib/matching');
        const score = calculateConflictScore(proposal, reviewer);
        if (score >= 0.8) {
          const flagData = generateConflictFlag(proposal, reviewer, score);
          if (flagData) {
            await sql`
              INSERT INTO conflict_flags (
                tenant_id, proposal_id, reviewer_user_id,
                conflict_type, reason, confidence_score, evidence
              ) VALUES (
                ${tokenUser.tenant_id},
                ${id},
                ${reviewer.user_id},
                ${flagData.conflict_type},
                ${flagData.reason},
                ${flagData.confidence_score},
                ${JSON.stringify(flagData.evidence)}::jsonb
              )
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }
    }

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'matching_generated',
      resourceType: 'proposal',
      resourceId: id,
      details: { matches_generated: storedMatches.length, top_n: topN },
    });

    return NextResponse.json({
      success: true,
      matches: storedMatches,
      cached: false,
    });
  } catch (error) {
    console.error('POST /api/v1/proposals/[id]/matching error:', error);
    return errorResponse('Failed to generate matches', 500, 'SERVER_ERROR');
  }
}

/**
 * GET /api/v1/proposals/:id/matching
 * Get existing matches for a proposal.
 */
export async function GET(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!hasRole(tokenUser, ['manager', 'admin'])) {
    return errorResponse('Insufficient permissions', 403, 'FORBIDDEN');
  }

  try {
    const { id } = await params;
    const sql = getDb();

    const matches = await sql`
      SELECT rm.*, u.full_name as reviewer_name, u.email as reviewer_email,
             rp.expertise, rp.current_assignments, rp.workload_limit
      FROM reviewer_matches rm
      JOIN users u ON rm.reviewer_user_id = u.id
      JOIN reviewer_profiles rp ON rp.user_id = u.id
      WHERE rm.proposal_id = ${id}
      ORDER BY rm.final_score DESC
    `;

    return NextResponse.json({
      matches: matches.map(m => ({
        id: m.id,
        reviewer_id: m.reviewer_user_id,
        reviewer_name: m.reviewer_name,
        reviewer_email: m.reviewer_email,
        expertise: m.expertise,
        relevance_score: m.relevance_score,
        conflict_score: m.conflict_score,
        bias_penalty: m.bias_penalty,
        final_score: m.final_score,
        reasoning: m.reasoning,
        current_assignments: m.current_assignments,
        workload_limit: m.workload_limit,
      })),
    });
  } catch (error) {
    console.error('GET /api/v1/proposals/[id]/matching error:', error);
    return errorResponse('Failed to fetch matches', 500, 'SERVER_ERROR');
  }
}
