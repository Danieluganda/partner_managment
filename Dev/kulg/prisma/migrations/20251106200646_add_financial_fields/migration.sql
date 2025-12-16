-- AlterTable
ALTER TABLE "partners" ADD COLUMN "actualSpent" REAL DEFAULT 0;
ALTER TABLE "partners" ADD COLUMN "budgetAllocated" REAL DEFAULT 0;
ALTER TABLE "partners" ADD COLUMN "comments" TEXT;
ALTER TABLE "partners" ADD COLUMN "financialStatus" TEXT;
ALTER TABLE "partners" ADD COLUMN "lastPaymentDate" TEXT;
ALTER TABLE "partners" ADD COLUMN "nextPaymentDue" TEXT;
ALTER TABLE "partners" ADD COLUMN "paymentSchedule" TEXT;
ALTER TABLE "partners" ADD COLUMN "q1ActualPaid" REAL DEFAULT 0;
ALTER TABLE "partners" ADD COLUMN "q2ActualPaid" REAL DEFAULT 0;
ALTER TABLE "partners" ADD COLUMN "q3ActualPaid" REAL DEFAULT 0;
ALTER TABLE "partners" ADD COLUMN "q4ActualPaid" REAL DEFAULT 0;
ALTER TABLE "partners" ADD COLUMN "utilizationRate" REAL DEFAULT 0;
