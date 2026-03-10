import { NextResponse } from 'next/server';
import { getDb, logAudit, createNotification } from '@/lib/db';
import { getUserFromToken, errorResponse, hasRole } from '@/lib/auth';

/**
 * GET /api/v1/reviews/:id
 * Get review details.
 */
export async function GET(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const sql = getDb();

    const reviews = await sql`
      SELECT r.*,
             p.title as proposal_title,
             p.abstract as proposal_abstract,
             p.keywords as proposal_keywords,
             p.collaborators as proposal_collaborators,
             p.tenant_id as proposal_tenant_id,
             u_applicant.full_name as applicant_name,
             u_applicant.email as applicant_email,
             t.config as tenant_config
      FROM reviews r
      JOIN proposals p ON r.proposal_id = p.id
      JOIN users u_applicant ON p.applicant_user_id = u_applicant.id
      JOIN tenants t ON r.tenant_id = t.id
      WHERE r.id = ${id} AND r.tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (reviews.length === 0) {
      return errorResponse('Review not found', 404, 'NOT_FOUND');
    }

    const review = reviews[0];

    // Check access permissions
    const isReviewOwner = review.reviewer_user_id === tokenUser.user_id;
    const isManagerOrAdmin = hasRole(tokenUser, ['manager', 'admin']);

    if (!isReviewOwner && !isManagerOrAdmin) {
      return errorResponse('Access denied', 403, 'FORBIDDEN');
    }

    const tenantConfig = review.tenant_config || {};
    const isDoubleBlind = tenantConfig.double_blind || false;

    return NextResponse.json({
      review: {
        id: review.id,
        proposal_id: review.proposal_id,
        status: review.status,
        assigned_at: review.assigned_at,
        accepted_at: review.accepted_at,
        completed_at: review.completed_at,
        due_date: review.due_date,
        scores: review.scores,
        comments: review.comments,
        anonymized: review.anonymized,
        conflict_declared: review.conflict_declared,
        proposal: {
          title: review.proposal_title,
          abstract: review.proposal_abstract,
          keywords: review.proposal_keywords,
          applicant_name: isDoubleBlind ? 'Anonymous Applicant' : review.applicant_name,
          applicant_email: isDoubleBlind ? null : review.applicant_email,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/v1/reviews/[id] error:', error);
    return errorResponse('Failed to fetch review', 500, 'SERVER_ERROR');
  }
}

/**
 * PATCH /api/v1/reviews/:id
 * Update review (accept, decline, save draft, submit, declare conflict).
 */
export async function PATCH(request, { params }) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, scores, comments, conflict_reason } = body;

    if (!action) {
      return errorResponse('action is required', 400, 'INVALID_INPUT');
    }

    const validActions = ['accept', 'decline', 'save_draft', 'submit', 'declare_conflict'];
    if (!validActions.includes(action)) {
      return errorResponse(`Invalid action. Must be one of: ${validActions.join(', ')}`, 400, 'INVALID_ACTION');
    }

    const sql = getDb();

    // Get review
    const reviews = await sql`
      SELECT r.*, p.title as proposal_title, p.applicant_user_id,
             p.tenant_id as proposal_tenant_id
      FROM reviews r
      JOIN proposals p ON r.proposal_id = p.id
      WHERE r.id = ${id} AND r.tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (reviews.length === 0) {
      return errorResponse('Review not found', 404, 'NOT_FOUND');
    }

    const review = reviews[0];

    // Only the review owner can update it
    if (review.reviewer_user_id !== tokenUser.user_id) {
      return errorResponse('Only the assigned reviewer can update this review', 403, 'FORBIDDEN');
    }

    let updatedReview;
    let message;
    let auditAction;

    switch (action) {
      case 'accept': {
        if (!['assigned'].includes(review.status)) {
          return errorResponse('Review can only be accepted when in assigned status', 400, 'INVALID_STATUS');
        }

        updatedReview = await sql`
          UPDATE reviews
          SET status = 'accepted', accepted_at = now()
          WHERE id = ${id}
          RETURNING *
        `;
        message = 'Review accepted';
        auditAction = 'review_accepted';

        // Notify manager
        const managers = await sql`
          SELECT id FROM users
          WHERE tenant_id = ${tokenUser.tenant_id} AND role IN ('manager', 'admin')
        `;
        for (const manager of managers) {
          await createNotification(sql, {
            tenantId: tokenUser.tenant_id,
            userId: manager.id,
            type: 'review_accepted',
            title: 'Review Accepted',
            message: `A reviewer has accepted the review for: "${review.proposal_title}"`,
            data: { review_id: id, proposal_id: review.proposal_id },
          });
        }
        break;
      }

      case 'decline': {
        if (!['assigned', 'accepted'].includes(review.status)) {
          return errorResponse('Review can only be declined when assigned or accepted', 400, 'INVALID_STATUS');
        }

        updatedReview = await sql`
          UPDATE reviews
          SET status = 'declined'
          WHERE id = ${id}
          RETURNING *
        `;

        // Decrease workload count
        await sql`
          UPDATE reviewer_profiles
          SET current_assignments = GREATEST(0, current_assignments - 1)
          WHERE user_id = ${tokenUser.user_id}
        `;

        message = 'Review declined';
        auditAction = 'review_declined';

        // Notify manager
        const managers = await sql`
          SELECT id FROM users
          WHERE tenant_id = ${tokenUser.tenant_id} AND role IN ('manager', 'admin')
        `;
        for (const manager of managers) {
          await createNotification(sql, {
            tenantId: tokenUser.tenant_id,
            userId: manager.id,
            type: 'review_declined',
            title: 'Review Declined',
            message: `A reviewer has declined the review for: "${review.proposal_title}"`,
            data: { review_id: id, proposal_id: review.proposal_id },
          });
        }
        break;
      }

      case 'save_draft': {
        if (!['accepted', 'in_progress'].includes(review.status)) {
          return errorResponse('Review must be accepted before saving a draft', 400, 'INVALID_STATUS');
        }

        updatedReview = await sql`
          UPDATE reviews
          SET status = 'in_progress',
              scores = COALESCE(${scores ? JSON.stringify(scores) : null}::jsonb, scores),
              comments = COALESCE(${comments || null}, comments)
          WHERE id = ${id}
          RETURNING *
        `;
        message = 'Review draft saved';
        auditAction = 'review_draft_saved';
        break;
      }

      case 'submit': {
        if (!['accepted', 'in_progress'].includes(review.status)) {
          return errorResponse('Review must be accepted or in progress before submitting', 400, 'INVALID_STATUS');
        }

        if (!scores || !scores.overall) {
          return errorResponse('Scores are required to submit a review', 400, 'SCORES_REQUIRED');
        }

        updatedReview = await sql`
          UPDATE reviews
          SET status = 'completed',
              completed_at = now(),
              scores = ${JSON.stringify(scores)}::jsonb,
              comments = COALESCE(${comments || null}, comments)
          WHERE id = ${id}
          RETURNING *
        `;

        // Decrease workload count
        await sql`
          UPDATE reviewer_profiles
          SET current_assignments = GREATEST(0, current_assignments - 1)
          WHERE user_id = ${tokenUser.user_id}
        `;

        message = 'Review submitted';
        auditAction = 'review_submitted';

        // Notify manager
        const managers = await sql`
          SELECT id FROM users
          WHERE tenant_id = ${tokenUser.tenant_id} AND role IN ('manager', 'admin')
        `;
        for (const manager of managers) {
          await createNotification(sql, {
            tenantId: tokenUser.tenant_id,
            userId: manager.id,
            type: 'review_submitted',
            title: 'Review Submitted',
            message: `A review has been submitted for: "${review.proposal_title}"`,
            data: { review_id: id, proposal_id: review.proposal_id },
          });
        }
        break;
      }

      case 'declare_conflict': {
        if (['completed', 'cancelled'].includes(review.status)) {
          return errorResponse('Cannot declare conflict on completed or cancelled review', 400, 'INVALID_STATUS');
        }

        updatedReview = await sql`
          UPDATE reviews
          SET status = 'cancelled', conflict_declared = true
          WHERE id = ${id}
          RETURNING *
        `;

        // Create conflict flag
        await sql`
          INSERT INTO conflict_flags (
            tenant_id, proposal_id, reviewer_user_id,
            conflict_type, reason, confidence_score
          ) VALUES (
            ${tokenUser.tenant_id},
            ${review.proposal_id},
            ${tokenUser.user_id},
            'declared',
            ${conflict_reason || 'Conflict declared by reviewer'},
            1.0
          )
        `;

        // Decrease workload count
        await sql`
          UPDATE reviewer_profiles
          SET current_assignments = GREATEST(0, current_assignments - 1)
          WHERE user_id = ${tokenUser.user_id}
        `;

        message = 'Conflict declared';
        auditAction = 'conflict_declared';

        // Notify manager
        const managers = await sql`
          SELECT id FROM users
          WHERE tenant_id = ${tokenUser.tenant_id} AND role IN ('manager', 'admin')
        `;
        for (const manager of managers) {
          await createNotification(sql, {
            tenantId: tokenUser.tenant_id,
            userId: manager.id,
            type: 'conflict_declared',
            title: 'Conflict of Interest Declared',
            message: `A reviewer has declared a conflict for: "${review.proposal_title}"`,
            data: {
              review_id: id,
              proposal_id: review.proposal_id,
              reason: conflict_reason,
            },
          });
        }
        break;
      }
    }

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: auditAction,
      resourceType: 'review',
      resourceId: id,
      details: { action, proposal_id: review.proposal_id },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview[0],
      message,
    });
  } catch (error) {
    console.error('PATCH /api/v1/reviews/[id] error:', error);
    return errorResponse('Failed to update review', 500, 'SERVER_ERROR');
  }
}
