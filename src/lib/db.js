import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

/**
 * Get a database connection using the DATABASE_URL environment variable.
 * Uses @neondatabase/serverless for serverless-compatible PostgreSQL connections.
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

/**
 * Execute a query with error handling and logging.
 * @param {Function} sql - The neon sql tagged template function
 * @param {Function} queryFn - Function that takes sql and returns a query
 */
export async function executeQuery(queryFn) {
  const sql = getDb();
  try {
    return await queryFn(sql);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Log an audit event to the audit_logs table.
 */
export async function logAudit(sql, { tenantId, userId, action, resourceType, resourceId, details, ipAddress, userAgent }) {
  try {
    await sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES (
        ${tenantId},
        ${userId},
        ${action},
        ${resourceType},
        ${resourceId || null},
        ${JSON.stringify(details || {})}::jsonb,
        ${ipAddress || null},
        ${userAgent || null}
      )
    `;
  } catch (error) {
    // Audit logging should not break the main flow
    console.error('Audit log error:', error);
  }
}

/**
 * Create a notification for a user.
 */
export async function createNotification(sql, { tenantId, userId, type, title, message, data }) {
  try {
    await sql`
      INSERT INTO notifications (tenant_id, user_id, type, title, message, data)
      VALUES (
        ${tenantId},
        ${userId},
        ${type},
        ${title},
        ${message || null},
        ${JSON.stringify(data || {})}::jsonb
      )
    `;
  } catch (error) {
    console.error('Notification creation error:', error);
  }
}
