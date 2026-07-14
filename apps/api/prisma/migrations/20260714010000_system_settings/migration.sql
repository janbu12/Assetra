CREATE TABLE "SystemSetting" (
  "id" TEXT NOT NULL DEFAULT 'organization',
  "organizationName" TEXT NOT NULL DEFAULT 'Perusahaan Demo Assetra',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "warrantyNotifications" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSetting" ("id", "updatedAt") VALUES ('organization', CURRENT_TIMESTAMP);
