INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':users:update'), r."id", 'users', 'update'
FROM "roles" r
WHERE r."name" = 'admin' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':roles:read'), r."id", 'roles', 'read'
FROM "roles" r
WHERE r."name" = 'admin' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

UPDATE "role_versions" rv
SET "version" = rv."version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "roles" r
WHERE rv."roleId" = r."id"
  AND r."name" = 'admin'
  AND r."isActive" = true;
