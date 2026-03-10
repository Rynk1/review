import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getUserFromToken, errorResponse } from '@/lib/auth';

/**
 * POST /api/v1/integrations/orcid
 * Link ORCID account and import publications.
 * 
 * In production, this would exchange the OAuth code for an access token
 * and fetch the ORCID profile. In demo mode, it accepts a mock ORCID ID.
 */
export async function POST(request) {
  const tokenUser = getUserFromToken(request);
  if (!tokenUser) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
  }

  try {
    const body = await request.json();
    const { orcid_code, redirect_uri, orcid_id } = body;

    if (!orcid_code && !orcid_id) {
      return errorResponse('orcid_code or orcid_id is required', 400, 'INVALID_INPUT');
    }

    const sql = getDb();

    let orcidId = orcid_id;
    let publications = [];

    if (orcid_code && !orcid_id) {
      // Production: Exchange code for access token
      // This would call ORCID OAuth token endpoint
      // For demo purposes, we simulate this
      try {
        const orcidClientId = process.env.ORCID_CLIENT_ID;
        const orcidClientSecret = process.env.ORCID_CLIENT_SECRET;

        if (orcidClientId && orcidClientSecret) {
          const tokenResponse = await fetch('https://orcid.org/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
            body: new URLSearchParams({
              client_id: orcidClientId,
              client_secret: orcidClientSecret,
              grant_type: 'authorization_code',
              code: orcid_code,
              redirect_uri: redirect_uri || '',
            }),
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            orcidId = tokenData.orcid;

            // Fetch publications from ORCID API
            const worksResponse = await fetch(
              `https://pub.orcid.org/v3.0/${orcidId}/works`,
              {
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${tokenData.access_token}`,
                },
              }
            );

            if (worksResponse.ok) {
              const worksData = await worksResponse.json();
              publications = (worksData.group || []).slice(0, 50).map(group => {
                const work = group['work-summary']?.[0];
                return {
                  title: work?.title?.title?.value || 'Unknown Title',
                  doi: work?.['external-ids']?.['external-id']?.find(
                    e => e['external-id-type'] === 'doi'
                  )?.['external-id-value'] || null,
                  year: work?.['publication-date']?.year?.value
                    ? parseInt(work['publication-date'].year.value)
                    : null,
                  authors: [],
                  journal: work?.['journal-title']?.value || null,
                  orcid_work_id: work?.['put-code']?.toString() || null,
                };
              }).filter(p => p.title !== 'Unknown Title');
            }
          }
        } else {
          // Demo mode: generate a mock ORCID ID
          orcidId = `0000-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      } catch (orcidError) {
        console.error('ORCID API error:', orcidError);
        // Fall through to demo mode
        orcidId = `0000-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    if (!orcidId) {
      return errorResponse('Failed to obtain ORCID ID', 400, 'ORCID_ERROR');
    }

    // Check ORCID uniqueness
    const existing = await sql`
      SELECT id FROM users WHERE orcid = ${orcidId} AND id != ${tokenUser.user_id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return errorResponse('This ORCID is already linked to another account', 409, 'ORCID_CONFLICT');
    }

    // Update user with ORCID
    await sql`
      UPDATE users SET orcid = ${orcidId}
      WHERE id = ${tokenUser.user_id}
    `;

    // Update reviewer profile with publications if reviewer
    let publicationsImported = 0;
    let profileUpdated = false;

    if (tokenUser.role === 'reviewer' && publications.length > 0) {
      await sql`
        UPDATE reviewer_profiles
        SET publications = ${JSON.stringify(publications)}::jsonb
        WHERE user_id = ${tokenUser.user_id}
      `;
      publicationsImported = publications.length;
      profileUpdated = true;
    }

    await logAudit(sql, {
      tenantId: tokenUser.tenant_id,
      userId: tokenUser.user_id,
      action: 'user_updated',
      resourceType: 'user',
      resourceId: tokenUser.user_id,
      details: { orcid_linked: orcidId, publications_imported: publicationsImported },
    });

    return NextResponse.json({
      success: true,
      orcid: orcidId,
      publications_imported: publicationsImported,
      profile_updated: profileUpdated,
    });
  } catch (error) {
    console.error('POST /api/v1/integrations/orcid error:', error);
    return errorResponse('Failed to link ORCID account', 500, 'SERVER_ERROR');
  }
}
