-- Add userId column to doctors table with unique constraint
-- This enables linking doctors to user accounts for authentication

ALTER TABLE "doctors" ADD COLUMN "userId" TEXT UNIQUE;

-- Add foreign key constraint to users table
ALTER TABLE "doctors" 
ADD CONSTRAINT "doctors_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;
