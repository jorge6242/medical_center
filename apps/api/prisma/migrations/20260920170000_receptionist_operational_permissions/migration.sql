INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':specialties:read'), r."id", 'specialties', 'read'
FROM "roles" r
WHERE r."name" = 'recepcionista' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':doctors:create'), r."id", 'doctors', 'create'
FROM "roles" r
WHERE r."name" = 'recepcionista' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':payments:read'), r."id", 'payments', 'read'
FROM "roles" r
WHERE r."name" = 'recepcionista' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':reports:read'), r."id", 'reports', 'read'
FROM "roles" r
WHERE r."name" = 'recepcionista' AND r."isActive" = true
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

UPDATE "role_versions"
SET "version" = 4, "updatedAt" = CURRENT_TIMESTAMP
WHERE "roleId" IN (
  SELECT r."id"
  FROM "roles" r
  WHERE r."name" = 'recepcionista' AND r."isActive" = true
)
AND "version" < 4;
