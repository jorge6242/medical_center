INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':patients:update'), r."id", 'patients', 'update'
FROM "roles" r
WHERE r."name" = 'recepcionista' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

UPDATE "role_versions" rv
SET "version" = GREATEST(rv."version", 10), "updatedAt" = CURRENT_TIMESTAMP
FROM "roles" r
WHERE rv."roleId" = r."id"
  AND r."name" = 'recepcionista'
  AND r."isActive" = true;
