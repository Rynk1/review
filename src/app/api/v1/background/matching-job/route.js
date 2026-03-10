import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse, hasRole } from '@/lib/auth';
import { runMatchingAlgorithm, generateConflictFlag, calculateConflictScore } from '@/lib/matching';

/**
 * POST /api/v1/background/matching-job
 * Trigger background matching job for batch processing.
 */
export async function POST(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!hasRole(tokenUser, ['admin'])) {
    return errorResponse('Only admins can trigger background matching jobs', 403, 'FORBIDDEN');
  }

  try {
    const body = await request.json();
    const { proposal_ids, force_refresh } = body;

    if (!proposal_ids || !Array.isArray(proposal_ids) || proposal_ids.length === 0) {
      return errorResponse('proposal_ids array is required', 400, 'INVALID_INPUT');
    }

    const sql = getDb();
    const jobId = crypto.randomUUID();
    let processed = 0;
    const errors = [];

    // Process each proposal
    for (const proposalId of proposal_ids) {
      try {
        // Get proposal
        const proposals = await sql`
          SELECT * FROM proposals
          WHERE id = ${proposalId} AND tenant_id = ${tokenUser.tenant_id}
            AND status IN ('submitted', 'under_review')
          LIMIT 1
        `;

        if (proposals.length === 0) {
          errors.push({ proposal_id: proposalId, error: 'Proposal not found or not in valid status' });
          continue;
        }

        const proposal = proposals[0];

        // Clear old matches if force refresh
        if (force_refresh) {
          await sql`DELETE FROM reviewer_matches WHERE proposal_id = ${proposalId}`;
        }

        // Get candidate reviewers
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
        const matches = runMatchingAlgorithm(proposal, reviewers, 10);

        // Store matches
        for (const match of matches) {
          await sql`
            INSERT INTO reviewer_matches (
              tenant_id, proposal_id, reviewer_user_id,
              relevance_score, conflict_score, bias_penalty, final_score, reasoning
            ) VALUES (
              ${tokenUser.tenant_id},
              ${proposalId},
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
          `;
        }

        // Generate conflict flags for high-conflict reviewers
        for (const reviewer of reviewers) {
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
                  ${proposalId},
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

        processed++;
      } catch (proposalError) {
        console.error(`Error processing proposal ${proposalId}:`, proposalError);
        errors.push({ proposal_id: proposalId, error: proposalError.message });
      }
    }

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'matching_requested',
      resourceType: 'background_job',
      details: {
        job_id: jobId,
        proposal_count: proposal_ids.length,
        processed,
        errors: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: 'completed',
      processed,
      total: proposal_ids.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('POST /api/v1/background/matching-job error:', error);
    return errorResponse('Failed to run matching job', 500, 'SERVER_ERROR');
  }
}
