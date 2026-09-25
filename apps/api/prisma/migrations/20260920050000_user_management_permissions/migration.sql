INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':users:read'), r."id", 'users', 'read'
FROM "roles" r
WHERE r."name" = 'admin'
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':users:create'), r."id", 'users', 'create'
FROM "roles" r
WHERE r."name" = 'admin'
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;

INSERT INTO "permissions" ("id", "roleId", "resource", "action")
SELECT md5(r."id" || ':users:delete'), r."id", 'users', 'delete'
FROM "roles" r
WHERE r."name" = 'admin'
ON CONFLICT ("roleId", "resource", "action") DO NOTHING;
