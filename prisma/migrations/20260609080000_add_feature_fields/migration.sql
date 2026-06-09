-- CreateEnum
CREATE TYPE "BookingFor" AS ENUM ('SELF', 'CHILD', 'OTHER');

-- CreateEnum
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED');

-- AlterTable: User - add contact/address fields
ALTER TABLE "User" 
  ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneWhatsApp" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "addressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "addressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

-- AlterTable: Booking - add bookingFor fields
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "bookingFor" "BookingFor" NOT NULL DEFAULT 'SELF',
  ADD COLUMN IF NOT EXISTS "attendeeName" TEXT,
  ADD COLUMN IF NOT EXISTS "attendeePhone" TEXT;

-- AlterTable: Message - add replyTo self-relation
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

-- AddForeignKey for Message self-relation
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" 
  FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: JobPosting
CREATE TABLE "JobPosting" (
  "id" TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requirements" TEXT,
  "employmentType" "JobEmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  "salary" TEXT,
  "salaryType" TEXT,
  "closingDate" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable: JobApplication
CREATE TABLE "JobApplication" (
  "id" TEXT NOT NULL,
  "jobPostingId" TEXT NOT NULL,
  "applicantProfileId" TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "coverLetter" TEXT,
  "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobPostingId_applicantProfileId_key" ON "JobApplication"("jobPostingId", "applicantProfileId");

-- AddForeignKey for JobPosting
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_providerProfileId_fkey"
  FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for JobApplication -> JobPosting
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobPostingId_fkey"
  FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for JobApplication -> applicant ProviderProfile
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_applicantProfileId_fkey"
  FOREIGN KEY ("applicantProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for JobApplication -> provider ProviderProfile
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_providerProfileId_fkey"
  FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
