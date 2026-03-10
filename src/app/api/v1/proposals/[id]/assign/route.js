import { NextResponse } from 'next/server';
import { getDb, logAudit, createNotification } from '@/lib/db';
import { getUserFromToken, errorResponse, hasRole } from '@/lib/auth';

/**
 * POST /api/v1/proposals/:id/assign
 * Assign reviewers to a proposal.
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
    const body = await request.json();
    const { reviewer_ids, due_date } = body;

    if (!reviewer_ids || !Array.isArray(reviewer_ids) || reviewer_ids.length === 0) {
      return errorResponse('reviewer_ids array is required', 400, 'INVALID_INPUT');
    }

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

    if (!['submitted', 'under_review'].includes(proposal.status)) {
      return errorResponse(
        'Reviewers can only be assigned to submitted or under_review proposals',
        400,
        'INVALID_STATUS'
      );
    }

    const assignments = [];

    for (const reviewerId of reviewer_ids) {
      // Verify reviewer exists in tenant
      const reviewers = await sql`
        SELECT u.*, rp.current_assignments, rp.workload_limit
        FROM users u
        JOIN reviewer_profiles rp ON rp.user_id = u.id
        WHERE u.id = ${reviewerId} AND u.tenant_id = ${tokenUser.tenant_id} AND u.role = 'reviewer'
        LIMIT 1
      `;

      if (reviewers.length === 0) {
        continue; // Skip invalid reviewer IDs
      }

      const reviewer = reviewers[0];

      // Check workload limit
      if (reviewer.current_assignments >= reviewer.workload_limit) {
        continue; // Skip overloaded reviewers
      }

      // Check for existing assignment
      const existing = await sql`
        SELECT id FROM reviews
        WHERE proposal_id = ${id} AND reviewer_user_id = ${reviewerId}
          AND status NOT IN ('declined', 'cancelled')
        LIMIT 1
      `;

      if (existing.length > 0) {
        continue; // Skip already assigned reviewers
      }

      // Create review record
      const reviews = await sql`
        INSERT INTO reviews (
          tenant_id, proposal_id, reviewer_user_id, status, due_date
        ) VALUES (
          ${tokenUser.tenant_id},
          ${id},
          ${reviewerId},
          'assigned',
          ${due_date || null}
        )
        RETURNING *
      `;

      const review = reviews[0];

      // Update reviewer workload count
      await sql`
        UPDATE reviewer_profiles
        SET current_assignments = current_assignments + 1
        WHERE user_id = ${reviewerId}
      `;

      // Create notification for reviewer
      await createNotification(sql, {
        tenantId: tokenUser.tenant_id,
        userId: reviewerId,
        type: 'review_assigned',
        title: 'New Review Assignment',
        message: `You have been assigned to review: "${proposal.title}"`,
        data: {
          proposal_id: id,
          review_id: review.id,
          due_date: due_date || null,
        },
      });

      // Log audit
      await logAudit(sql, {
        tenantId: tokenUser.tenant_id,
        userId: tokenUser.user_id,
        action: 'review_assigned',
        resourceType: 'review',
        resourceId: review.id,
        details: {
          proposal_id: id,
          reviewer_id: reviewerId,
          due_date: due_date || null,
        },
      });

      assignments.push({
        review_id: review.id,
        reviewer_id: reviewerId,
        proposal_id: id,
        status: 'assigned',
        due_date: review.due_date,
      });
    }

    // Update proposal status to under_review if it was submitted
    if (proposal.status === 'submitted' && assignments.length > 0) {
      await sql`
        UPDATE proposals SET status = 'under_review'
        WHERE id = ${id} AND tenant_id = ${tokenUser.tenant_id}
      `;
    }

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error) {
    console.error('POST /api/v1/proposals/[id]/assign error:', error);
    return errorResponse('Failed to assign reviewers', 500, 'SERVER_ERROR');
  }
}
