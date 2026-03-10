import { NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { generateToken } from '@/lib/auth';

/**
 * POST /api/auth/sso/callback
 * Handle SSO authentication callback (SAML/OIDC).
 * In demo mode, accepts direct credentials for testing.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sso_subject, email, full_name, tenant_domain, provider } = body;

    if (!email || !tenant_domain) {
      return NextResponse.json(
        { error: 'email and tenant_domain are required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Find tenant by domain
    const tenants = await sql`
      SELECT * FROM tenants WHERE domain = ${tenant_domain} LIMIT 1
    `;

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found for domain: ' + tenant_domain, code: 'TENANT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const tenant = tenants[0];

    // Find or create user
    let users = await sql`
      SELECT * FROM users 
      WHERE tenant_id = ${tenant.id} AND email = ${email}
      LIMIT 1
    `;

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user
      const newUsers = await sql`
        INSERT INTO users (tenant_id, email, full_name, role, sso_subject)
        VALUES (${tenant.id}, ${email}, ${full_name || null}, 'applicant', ${sso_subject || null})
        RETURNING *
      `;
      user = newUsers[0];
      isNewUser = true;
    } else {
      user = users[0];
      // Update SSO subject and name if provided
      if (sso_subject || full_name) {
        const updated = await sql`
          UPDATE users 
          SET 
            sso_subject = COALESCE(${sso_subject || null}, sso_subject),
            full_name = COALESCE(${full_name || null}, full_name)
          WHERE id = ${user.id}
          RETURNING *
        `;
        user = updated[0];
      }
    }

    // Generate JWT token
    const token = generateToken({
      user_id: user.id,
      tenant_id: tenant.id,
      role: user.role,
    });

    // Log audit event
    await logAudit(sql, {
      tenantId: tenant.id,
      userId: user.id,
      action: isNewUser ? 'user_created' : 'user_login',
      resourceType: 'user',
      resourceId: user.id,
      details: { provider: provider || 'demo', email },
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        orcid: user.orcid,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        config: tenant.config,
      },
    });
  } catch (error) {
    console.error('SSO callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', code: 'AUTH_ERROR' },
      { status: 500 }
    );
  }
}
