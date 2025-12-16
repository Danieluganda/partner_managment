/*
  Warnings:

  - Added the required column `partnerType` to the `personnel` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerType" TEXT NOT NULL,
    "partnerId" TEXT,
    "partnerName" TEXT,
    "partnerStatus" TEXT,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT,
    "seniority" TEXT,
    "emailAddress" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "alternateEmail" TEXT,
    "alternatePhone" TEXT,
    "officeLocation" TEXT,
    "reportsTo" TEXT,
    "workStatus" TEXT,
    "preferredContact" TEXT,
    "responsibilities" TEXT,
    "projectAssignments" TEXT,
    "teamMembers" TEXT,
    "skills" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_personnel" ("createdAt", "department", "emailAddress", "fullName", "id", "jobTitle", "officeLocation", "phoneNumber", "projectAssignments", "reportsTo", "responsibilities", "teamMembers", "updatedAt") SELECT "createdAt", "department", "emailAddress", "fullName", "id", "jobTitle", "officeLocation", "phoneNumber", "projectAssignments", "reportsTo", "responsibilities", "teamMembers", "updatedAt" FROM "personnel";
DROP TABLE "personnel";
ALTER TABLE "new_personnel" RENAME TO "personnel";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
