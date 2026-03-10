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
    const { title, abstract, keywords, collaborators, attachments } = body;

    if (!title || !abstract) {
      return errorResponse('title and abstract are required', 400, 'INVALID_INPUT');
    }

    const sql = getDb();

    const proposals = await sql`
      INSERT INTO proposals (
        tenant_id, applicant_user_id, title, abstract, keywords, collaborators, attachments, status
      ) VALUES (
        ${tokenUser.tenant_id},
        ${tokenUser.user_id},
        ${title},
        ${abstract},
        ${keywords || []}::text[],
        ${JSON.stringify(collaborators || [])}::jsonb,
        ${JSON.stringify(attachments || [])}::jsonb,
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
