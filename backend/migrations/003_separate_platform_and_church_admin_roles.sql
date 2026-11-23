BEGIN;

-- Platform Administrators manage church registrations from the platform.
-- Their account must not hold or activate any church-scoped role.
DELETE FROM membership_roles mr
USING
    church_memberships cm,
    user_platform_roles upr,
    platform_roles pr
WHERE mr.membership_id = cm.id
  AND mr.church_id = cm.church_id
  AND upr.user_id = cm.user_id
  AND pr.id = upr.role_id
  AND pr.role_name = 'super_admin';

-- Preserve historical references to old memberships, but make those
-- memberships inactive now that the account is platform-only.
UPDATE church_memberships cm
SET membership_status = 'suspended'
FROM user_platform_roles upr
JOIN platform_roles pr
  ON pr.id = upr.role_id
 AND pr.role_name = 'super_admin'
WHERE cm.user_id = upr.user_id
  AND cm.membership_status <> 'suspended';

DROP TRIGGER IF EXISTS trg_separate_platform_from_church_admin
ON membership_roles;

DROP TRIGGER IF EXISTS trg_separate_platform_from_church_roles
ON membership_roles;

DROP FUNCTION IF EXISTS prevent_platform_admin_church_admin_role();

CREATE OR REPLACE FUNCTION prevent_platform_admin_church_role()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM church_memberships cm
        JOIN user_platform_roles upr
          ON upr.user_id = cm.user_id
        JOIN platform_roles pr
          ON pr.id = upr.role_id
        WHERE cm.id = NEW.membership_id
          AND cm.church_id = NEW.church_id
          AND pr.role_name = 'super_admin'
    ) THEN
        RAISE EXCEPTION
            'Platform Administrator accounts cannot receive church roles.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_separate_platform_from_church_roles
BEFORE INSERT OR UPDATE ON membership_roles
FOR EACH ROW
EXECUTE FUNCTION prevent_platform_admin_church_role();

DROP TRIGGER IF EXISTS trg_separate_church_admin_from_platform
ON user_platform_roles;

DROP TRIGGER IF EXISTS trg_separate_church_account_from_platform
ON user_platform_roles;

DROP FUNCTION IF EXISTS prevent_church_admin_platform_role();

CREATE OR REPLACE FUNCTION prevent_church_account_platform_role()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM platform_roles pr
        WHERE pr.id = NEW.role_id
          AND pr.role_name = 'super_admin'
    ) AND EXISTS (
        SELECT 1
        FROM church_memberships cm
        WHERE cm.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION
            'Church membership accounts cannot receive the Platform Administrator role.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_separate_church_account_from_platform
BEFORE INSERT OR UPDATE ON user_platform_roles
FOR EACH ROW
EXECUTE FUNCTION prevent_church_account_platform_role();

CREATE OR REPLACE FUNCTION prevent_platform_admin_church_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM user_platform_roles upr
        JOIN platform_roles pr
          ON pr.id = upr.role_id
        WHERE upr.user_id = NEW.user_id
          AND pr.role_name = 'super_admin'
    ) THEN
        IF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION
                'Platform Administrator accounts cannot have church memberships.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.user_id IS DISTINCT FROM OLD.user_id
           OR (
               NEW.membership_status = 'active'
               AND OLD.membership_status IS DISTINCT FROM 'active'
           ) THEN
            RAISE EXCEPTION
                'Platform Administrator accounts cannot have active church memberships.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_platform_admin_church_membership
ON church_memberships;

CREATE TRIGGER trg_prevent_platform_admin_church_membership
BEFORE INSERT OR UPDATE ON church_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_platform_admin_church_membership();

COMMIT;
