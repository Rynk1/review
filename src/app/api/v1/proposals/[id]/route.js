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
    const { title, abstract, keywords, collaborators, status } = body;

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

    // Build update
    const updated = await sql`
      UPDATE proposals
      SET
        title = COALESCE(${title || null}, title),
        abstract = COALESCE(${abstract || null}, abstract),
        keywords = COALESCE(${keywords ? keywords : null}::text[], keywords),
        collaborators = COALESCE(${collaborators ? JSON.stringify(collaborators) : null}::jsonb, collaborators),
        status = COALESCE(${status || null}, status),
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
