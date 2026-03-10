import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse } from '@/lib/auth';

/**
 * POST /api/v1/reviewers/optin
 * Opt in/out of reviewer pool and update profile.
 */
export async function POST(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (tokenUser.role !== 'reviewer') {
    return errorResponse('Only reviewers can update their opt-in status', 403, 'FORBIDDEN');
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
    console.error('POST /api/v1/reviewers/optin error:', error);
    return errorResponse('Failed to update opt-in status', 500, 'SERVER_ERROR');
  }
}
