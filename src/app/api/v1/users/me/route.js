import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse } from '@/lib/auth';

/**
 * GET /api/v1/users/me
 * Get current user profile with tenant and reviewer profile.
 */
export async function GET(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const sql = getDb();

    // Get user with tenant
    const users = await sql`
      SELECT u.*, t.name as tenant_name, t.config as tenant_config
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = ${tokenUser.user_id} AND u.tenant_id = ${tokenUser.tenant_id}
      LIMIT 1
    `;

    if (users.length === 0) {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }

    const user = users[0];

    // Get reviewer profile if exists
    let reviewerProfile = null;
    if (user.role === 'reviewer') {
      const profiles = await sql`
        SELECT * FROM reviewer_profiles
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      if (profiles.length > 0) {
        reviewerProfile = profiles[0];
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        orcid: user.orcid,
        created_at: user.created_at,
      },
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        config: user.tenant_config,
      },
      reviewer_profile: reviewerProfile ? {
        id: reviewerProfile.id,
        expertise: reviewerProfile.expertise,
        areas: reviewerProfile.areas,
        publications: reviewerProfile.publications,
        availability: reviewerProfile.availability,
        workload_limit: reviewerProfile.workload_limit,
        current_assignments: reviewerProfile.current_assignments,
        opt_in: reviewerProfile.opt_in,
        bias_score: reviewerProfile.bias_score,
      } : null,
    });
  } catch (error) {
    console.error('GET /api/v1/users/me error:', error);
    return errorResponse('Failed to fetch user profile', 500, 'SERVER_ERROR');
  }
}

/**
 * PUT /api/v1/users/me
 * Update current user profile.
 */
export async function PUT(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const body = await request.json();
    const { full_name, orcid } = body;

    const sql = getDb();

    // Check ORCID uniqueness if provided
    if (orcid) {
      const existing = await sql`
        SELECT id FROM users WHERE orcid = ${orcid} AND id != ${tokenUser.user_id}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return errorResponse('ORCID already linked to another account', 409, 'ORCID_CONFLICT');
      }
    }

    const updated = await sql`
      UPDATE users
      SET
        full_name = COALESCE(${full_name || null}, full_name),
        orcid = COALESCE(${orcid || null}, orcid)
      WHERE id = ${tokenUser.user_id} AND tenant_id = ${tokenUser.tenant_id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'user_updated',
      resourceType: 'user',
      resourceId: tokenUser.user_id,
      details: { fields_updated: Object.keys(body) },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated[0].id,
        email: updated[0].email,
        full_name: updated[0].full_name,
        role: updated[0].role,
        orcid: updated[0].orcid,
      },
    });
  } catch (error) {
    console.error('PUT /api/v1/users/me error:', error);
    return errorResponse('Failed to update user profile', 500, 'SERVER_ERROR');
  }
}
