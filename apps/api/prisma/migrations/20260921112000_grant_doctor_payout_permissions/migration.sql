INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':doctor_payouts:' || permission.action), r."id", 'doctor_payouts', permission.action
FROM "roles" r
CROSS JOIN (VALUES ('read'), ('create'), ('delete')) AS permission(action)
WHERE r."name" = 'admin' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':doctor_payouts:' || permission.action), r."id", 'doctor_payouts', permission.action
FROM "roles" r
CROSS JOIN (VALUES ('read'), ('create')) AS permission(action)
WHERE r."name" = 'recepcionista' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

UPDATE "role_versions" rv
SET "version" = CASE WHEN r."name" = 'recepcionista' THEN GREATEST(rv."version", 6) ELSE GREATEST(rv."version", 2) END,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "roles" r
WHERE rv."roleId" = r."id"
  AND r."name" IN ('admin', 'recepcionista')
  AND r."isActive" = true;
