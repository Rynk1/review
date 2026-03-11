/**
 * Demo mode data - used when DATABASE_URL is not available
 * This allows testing the application without a database connection
 */
const DEMO_TENANTS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Stanford University',
    domain: 'stanford.edu',
    config: { double_blind: false, cross_tenant_sharing: false, workload_limit: 5 },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'MIT',
    domain: 'mit.edu',
    config: { double_blind: true, cross_tenant_sharing: false, workload_limit: 4 },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Harvard University',
    domain: 'harvard.edu',
    config: { double_blind: false, cross_tenant_sharing: true, workload_limit: 6 },
  },
];

const DEMO_USERS = [
  // Stanford users
  { id: 'a1111111-1111-1111-1111-111111111111', tenant_id: '11111111-1111-1111-1111-111111111111', email: 'admin@stanford.edu', full_name: 'Stanford Admin', role: 'admin', orcid: null },
  { id: 'a2222222-1111-1111-1111-111111111111', tenant_id: '11111111-1111-1111-1111-111111111111', email: 'manager@stanford.edu', full_name: 'Stanford Manager', role: 'manager', orcid: null },
  { id: 'a3333333-1111-1111-1111-111111111111', tenant_id: '11111111-1111-1111-1111-111111111111', email: 'reviewer1@stanford.edu', full_name: 'Dr. Alice Chen', role: 'reviewer', orcid: '0000-0001-2345-6789' },
  { id: 'a4444444-1111-1111-1111-111111111111', tenant_id: '11111111-1111-1111-1111-111111111111', email: 'reviewer2@stanford.edu', full_name: 'Dr. Bob Martinez', role: 'reviewer', orcid: '0000-0002-3456-7890' },
  { id: 'a5555555-1111-1111-1111-111111111111', tenant_id: '11111111-1111-1111-1111-111111111111', email: 'applicant@stanford.edu', full_name: 'Carol Johnson', role: 'applicant', orcid: null },
  // MIT users
  { id: 'b1111111-2222-2222-2222-222222222222', tenant_id: '22222222-2222-2222-2222-222222222222', email: 'admin@mit.edu', full_name: 'MIT Admin', role: 'admin', orcid: null },
  { id: 'b2222222-2222-2222-2222-222222222222', tenant_id: '22222222-2222-2222-2222-222222222222', email: 'manager@mit.edu', full_name: 'MIT Manager', role: 'manager', orcid: null },
  { id: 'b3333333-2222-2222-2222-222222222222', tenant_id: '22222222-2222-2222-2222-222222222222', email: 'reviewer1@mit.edu', full_name: 'Dr. David Kim', role: 'reviewer', orcid: '0000-0003-4567-8901' },
  { id: 'b4444444-2222-2222-2222-222222222222', tenant_id: '22222222-2222-2222-2222-222222222222', email: 'reviewer2@mit.edu', full_name: 'Dr. Emma Wilson', role: 'reviewer', orcid: '0000-0004-5678-9012' },
  { id: 'b5555555-2222-2222-2222-222222222222', tenant_id: '22222222-2222-2222-2222-222222222222', email: 'applicant@mit.edu', full_name: 'Frank Lee', role: 'applicant', orcid: null },
  // Harvard users
  { id: 'c1111111-3333-3333-3333-333333333333', tenant_id: '33333333-3333-3333-3333-333333333333', email: 'admin@harvard.edu', full_name: 'Harvard Admin', role: 'admin', orcid: null },
  { id: 'c2222222-3333-3333-3333-333333333333', tenant_id: '33333333-3333-3333-3333-333333333333', email: 'manager@harvard.edu', full_name: 'Harvard Manager', role: 'manager', orcid: null },
  { id: 'c3333333-3333-3333-3333-333333333333', tenant_id: '33333333-3333-3333-3333-333333333333', email: 'reviewer1@harvard.edu', full_name: 'Dr. Grace Park', role: 'reviewer', orcid: '0000-0005-6789-0123' },
  { id: 'c4444444-3333-3333-3333-333333333333', tenant_id: '33333333-3333-3333-3333-333333333333', email: 'reviewer2@harvard.edu', full_name: 'Dr. Henry Brown', role: 'reviewer', orcid: '0000-0006-7890-1234' },
  { id: 'c5555555-3333-3333-3333-333333333333', tenant_id: '33333333-3333-3333-3333-333333333333', email: 'applicant@harvard.edu', full_name: 'Iris Davis', role: 'applicant', orcid: null },
];

/**
 * Check if we're running in demo mode (no database)
 */
export function isDemoMode() {
  return !process.env.DATABASE_URL;
}

/**
 * Get demo tenant by domain
 */
export function getDemoTenant(domain) {
  return DEMO_TENANTS.find(t => t.domain === domain) || null;
}

/**
 * Get demo user by email and tenant
 */
export function getDemoUser(email, tenantId) {
  return DEMO_USERS.find(u => u.email === email && u.tenant_id === tenantId) || null;
}

/**
 * Authentication utilities for JWT token management.
 * Uses Base64-encoded JSON tokens for simplicity.
 * Production should use proper JWT signing (e.g., jose library).
 */

/**
 * Generate a JWT-like token for a user.
 * @param {Object} payload - Token payload
 * @returns {string} Base64-encoded token
 */
export function generateToken(payload) {
  const tokenData = {
    ...payload,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

/**
 * Validate and decode a token from a request.
 * @param {Request} request - Next.js request object
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export function getUserFromToken(request) {
  const authHeader = request.headers.get('authorization');
  console.log('Auth header received:', authHeader ? 'present' : 'missing');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No Bearer token');
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    console.log('Decoded token:', decoded);

    if (decoded.exp < Date.now()) {
      console.log('Token expired');
      return null; // Token expired
    }

    return decoded;
  } catch (error) {
    console.log('Token decode error:', error.message);
    return null;
  }
}

/**
 * Require authentication - returns user or throws error response.
 * @param {Request} request - Next.js request object
 * @returns {Object} Decoded token payload
 * @throws {Response} 401 response if not authenticated
 */
export function requireAuth(request) {
  const user = getUserFromToken(request);
  if (!user) {
    throw new Response(
      JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return user;
}

/**
 * Require specific role(s) - returns user or throws error response.
 * @param {Request} request - Next.js request object
 * @param {string|string[]} roles - Required role(s)
 * @returns {Object} Decoded token payload
 * @throws {Response} 401/403 response if not authorized
 */
export function requireRole(request, roles) {
  const user = requireAuth(request);
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(user.role)) {
    throw new Response(
      JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Check if user has one of the specified roles.
 * @param {Object} user - User token payload
 * @param {string|string[]} roles - Role(s) to check
 * @returns {boolean}
 */
export function hasRole(user, roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}

/**
 * Create a standard error response.
 */
export function errorResponse(message, status = 400, code = 'ERROR') {
  return Response.json({ error: message, code }, { status });
}

/**
 * Create a standard success response.
 */
export function successResponse(data, status = 200) {
  return Response.json(data, { status });
}
