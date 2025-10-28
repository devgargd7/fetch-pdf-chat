-- AlterTable: Make filePath nullable
ALTER TABLE "Document" ALTER COLUMN "filePath" DROP NOT NULL;

