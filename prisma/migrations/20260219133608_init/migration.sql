-- AlterTable
ALTER TABLE "VisionBoard" ADD COLUMN     "isGloabal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "categoryId" DROP NOT NULL;
