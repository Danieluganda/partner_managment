-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "keyPersonnel" TEXT,
    "regionsOfOperation" TEXT,
    "taskOrderPrice" TEXT,
    "contractStatus" TEXT,
    "commencementDate" TEXT,
    "contractDuration" TEXT,
    "contractValue" TEXT,
    "contractStartDate" TEXT,
    "contractEndDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "external_partners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "keyContact" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "dateInitiated" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "keyObjectives" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pendingTasks" TEXT,
    "responsible" TEXT NOT NULL,
    "deadline" TEXT,
    "notesBlockers" TEXT,
    "estimatedValue" TEXT,
    "priority" TEXT,
    "region" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "financial_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT,
    "partnerName" TEXT NOT NULL,
    "contractValue" TEXT NOT NULL,
    "budgetAllocated" TEXT,
    "actualSpent" TEXT,
    "remainingBudget" TEXT,
    "paymentSchedule" TEXT,
    "lastPaymentDate" TEXT,
    "nextPaymentDue" TEXT,
    "financialStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT,
    "emailAddress" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "officeLocation" TEXT,
    "reportsTo" TEXT,
    "teamMembers" TEXT,
    "responsibilities" TEXT,
    "projectAssignments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliverableName" TEXT NOT NULL,
    "partnerId" TEXT,
    "partnerName" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "compliance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT,
    "partnerName" TEXT NOT NULL,
    "complianceType" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TEXT,
    "lastReviewDate" TEXT,
    "nextReviewDate" TEXT,
    "responsiblePerson" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
