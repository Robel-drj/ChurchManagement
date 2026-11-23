export const PLATFORM_ADMIN_ROLE = "super_admin";

export const PLATFORM_ADMIN_CHURCH_ACCESS_MESSAGE =
  "Platform Administrator accounts are limited to platform management and cannot access church workspaces.";

export const PLATFORM_ADMIN_ROLE_CONFLICT_MESSAGE =
  "Platform Administrator accounts cannot receive church roles. Use a separate account for church membership or Church Administration.";

export function hasPlatformAdminRole(roleNames = []) {
  return Array.isArray(roleNames) && roleNames.includes(PLATFORM_ADMIN_ROLE);
}

export function getPermittedChurchMemberships(
  platformRoles,
  memberships
) {
  return hasPlatformAdminRole(platformRoles) ? [] : memberships;
}

export async function userHasPlatformAdminRole(queryable, userId) {
  const result = await queryable.query(
    `SELECT 1
     FROM user_platform_roles upr
     JOIN platform_roles pr ON pr.id = upr.role_id
     WHERE upr.user_id = $1
       AND pr.role_name = $2
     LIMIT 1`,
    [userId, PLATFORM_ADMIN_ROLE]
  );

  return result.rowCount > 0;
}
