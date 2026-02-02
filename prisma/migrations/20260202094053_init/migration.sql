/*
  Warnings:

  - The values [MALE,FEMALE,ANDROGYNOUS] on the enum `TtsVoicePreference` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TtsVoicePreference_new" AS ENUM ('MALE_CONFIDENT', 'MALE_FRIENDLY', 'FEMALE_EMPATHETIC', 'FEMALE_ENERGETIC', 'ANDROGYNOUS_CALM', 'ANDROGYNOUS_WISE');
ALTER TABLE "public"."User" ALTER COLUMN "ttsVoicePreference" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "ttsVoicePreference" TYPE "TtsVoicePreference_new" USING ("ttsVoicePreference"::text::"TtsVoicePreference_new");
ALTER TYPE "TtsVoicePreference" RENAME TO "TtsVoicePreference_old";
ALTER TYPE "TtsVoicePreference_new" RENAME TO "TtsVoicePreference";
DROP TYPE "public"."TtsVoicePreference_old";
ALTER TABLE "User" ALTER COLUMN "ttsVoicePreference" SET DEFAULT 'ANDROGYNOUS_CALM';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "ttsVoicePreference" SET DEFAULT 'ANDROGYNOUS_CALM';
