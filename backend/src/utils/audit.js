export async function writeAudit(client, {
  churchId = null, userId = null, action,
  entityType = null, entityId = null, details = null, ipAddress = null
}) {
  await client.query(
    `INSERT INTO audit_logs
       (church_id, user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [churchId, userId, action, entityType, entityId,
     details ? JSON.stringify(details) : null, ipAddress]
  );
}
