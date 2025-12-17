-- CreateEnum
CREATE TYPE "TtsVoicePreference" AS ENUM ('MALE', 'FEMALE', 'ANDROGYNOUS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ttsVoicePreference" "TtsVoicePreference" DEFAULT 'ANDROGYNOUS';
