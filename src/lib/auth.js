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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    if (decoded.exp < Date.now()) {
      return null; // Token expired
    }

    return decoded;
  } catch (error) {
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
