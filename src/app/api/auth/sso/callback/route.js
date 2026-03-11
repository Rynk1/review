import { NextResponse } from 'next/server';
import { generateToken, isDemoMode, getDemoTenant, getDemoUser } from '@/lib/auth';

/**
 * POST /api/auth/sso/callback
 * Handle SSO authentication callback (SAML/OIDC).
 * In demo mode (no DATABASE_URL), uses in-memory demo data.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, full_name, tenant_domain } = body;
    
    console.log('SSO callback request:', { email, tenant_domain, demoMode: isDemoMode() });

    if (!email || !tenant_domain) {
      return NextResponse.json(
        { error: 'email and tenant_domain are required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Demo mode: use in-memory data
    if (isDemoMode()) {
      console.log('Running in DEMO MODE - using in-memory data');
      
      const tenant = getDemoTenant(tenant_domain);
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found for domain: ' + tenant_domain, code: 'TENANT_NOT_FOUND' },
          { status: 404 }
        );
      }

      const user = getDemoUser(email, tenant.id);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found for email: ' + email, code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Generate JWT token
      const token = generateToken({
        user_id: user.id,
        tenant_id: tenant.id,
        role: user.role,
      });

      console.log('Demo authentication successful for:', user.email, 'role:', user.role);
      
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
        demoMode: true,
      });
    }

    // Production mode: use database
    const { getDb, logAudit } = await import('@/lib/db');
    const { sso_subject, provider } = body;
    
    const sql = getDb();

    // Find tenant by domain
    const tenants = await sql`
      SELECT * FROM tenants WHERE domain = ${tenant_domain} LIMIT 1
    `;
    console.log('Found tenants:', tenants.length);

    if (tenants.length === 0) {
      console.log('Tenant not found for domain:', tenant_domain);
      return NextResponse.json(
        { error: 'Tenant not found for domain: ' + tenant_domain, code: 'TENANT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const tenant = tenants[0];
    console.log('Using tenant:', tenant.id, tenant.name);

    // Find or create user
    let users = await sql`
      SELECT * FROM users
      WHERE tenant_id = ${tenant.id} AND email = ${email}
      LIMIT 1
    `;
    console.log('Found users:', users.length);

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

    console.log('Authentication successful for user:', user.email, 'role:', user.role);
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
    console.error('Error stack:', error.stack);
    // Return detailed error for debugging
    return NextResponse.json(
      { error: 'Authentication failed: ' + error.message, code: 'AUTH_ERROR', details: error.stack },
      { status: 500 }
    );
  }
}
