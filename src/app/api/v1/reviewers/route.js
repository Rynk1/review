import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse, hasRole } from '@/lib/auth';

/**
 * GET /api/v1/reviewers
 * Search and list reviewers.
 */
export async function GET(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!hasRole(tokenUser, ['manager', 'admin', 'reviewer'])) {
    return errorResponse('Insufficient permissions', 403, 'FORBIDDEN');
  }

  try {
    const { searchParams } = new URL(request.url);
    const expertise = searchParams.get('expertise');
    const optIn = searchParams.get('opt_in');
    const available = searchParams.get('available');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const sql = getDb();

    // Build dynamic query
    let reviewers;
    let total;

    if (expertise) {
      reviewers = await sql`
        SELECT rp.*, u.full_name, u.email, u.orcid, u.id as user_id
        FROM reviewer_profiles rp
        JOIN users u ON rp.user_id = u.id
        WHERE rp.tenant_id = ${tokenUser.tenant_id}
          AND (${optIn || null} IS NULL OR rp.opt_in = ${optIn === 'true'})
          AND (${available || null} IS NULL OR rp.current_assignments < rp.workload_limit)
          AND rp.expertise && ARRAY[${expertise}]::text[]
        ORDER BY rp.current_assignments ASC, u.full_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM reviewer_profiles rp
        WHERE rp.tenant_id = ${tokenUser.tenant_id}
          AND (${optIn || null} IS NULL OR rp.opt_in = ${optIn === 'true'})
          AND (${available || null} IS NULL OR rp.current_assignments < rp.workload_limit)
          AND rp.expertise && ARRAY[${expertise}]::text[]
      `;
      total = parseInt(countResult[0].count);
    } else {
      reviewers = await sql`
        SELECT rp.*, u.full_name, u.email, u.orcid, u.id as user_id
        FROM reviewer_profiles rp
        JOIN users u ON rp.user_id = u.id
        WHERE rp.tenant_id = ${tokenUser.tenant_id}
          AND (${optIn || null} IS NULL OR rp.opt_in = ${optIn === 'true'})
          AND (${available || null} IS NULL OR rp.current_assignments < rp.workload_limit)
        ORDER BY rp.current_assignments ASC, u.full_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM reviewer_profiles rp
        WHERE rp.tenant_id = ${tokenUser.tenant_id}
          AND (${optIn || null} IS NULL OR rp.opt_in = ${optIn === 'true'})
          AND (${available || null} IS NULL OR rp.current_assignments < rp.workload_limit)
      `;
      total = parseInt(countResult[0].count);
    }

    return NextResponse.json({
      reviewers: reviewers.map(r => ({
        id: r.id,
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        orcid: r.orcid,
        expertise: r.expertise,
        areas: r.areas,
        workload_limit: r.workload_limit,
        current_assignments: r.current_assignments,
        opt_in: r.opt_in,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/v1/reviewers error:', error);
    return errorResponse('Failed to fetch reviewers', 500, 'SERVER_ERROR');
  }
}

/**
 * POST /api/v1/reviewers/optin
 * Opt in/out of reviewer pool and update profile.
 * Note: This is handled at /api/v1/reviewers/optin/route.js
 * but we also handle profile creation here for reviewers.
 */
export async function POST(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (tokenUser.role !== 'reviewer') {
    return errorResponse('Only reviewers can update their profile', 403, 'FORBIDDEN');
  }

  try {
    const body = await request.json();
    const { opt_in, expertise, areas, availability, workload_limit } = body;

    const sql = getDb();

    // Upsert reviewer profile
    const profiles = await sql`
      INSERT INTO reviewer_profiles (user_id, tenant_id, opt_in, expertise, areas, availability, workload_limit)
      VALUES (
        ${tokenUser.user_id},
        ${tokenUser.tenant_id},
        ${opt_in !== undefined ? opt_in : true},
        ${expertise || []}::text[],
        ${JSON.stringify(areas || { subjects: [], methods: [], disciplines: [] })}::jsonb,
        ${JSON.stringify(availability || { weekly_hours: 10, blackout_dates: [] })}::jsonb,
        ${workload_limit || 5}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        opt_in = COALESCE(${opt_in !== undefined ? opt_in : null}, reviewer_profiles.opt_in),
        expertise = COALESCE(${expertise ? expertise : null}::text[], reviewer_profiles.expertise),
        areas = COALESCE(${areas ? JSON.stringify(areas) : null}::jsonb, reviewer_profiles.areas),
        availability = COALESCE(${availability ? JSON.stringify(availability) : null}::jsonb, reviewer_profiles.availability),
        workload_limit = COALESCE(${workload_limit || null}, reviewer_profiles.workload_limit)
      RETURNING *
    `;

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'user_updated',
      resourceType: 'reviewer_profile',
      resourceId: profiles[0].id,
      details: { opt_in, expertise_count: expertise?.length },
    });

    return NextResponse.json({
      success: true,
      profile: profiles[0],
    });
  } catch (error) {
    console.error('POST /api/v1/reviewers error:', error);
    return errorResponse('Failed to update reviewer profile', 500, 'SERVER_ERROR');
  }
}
