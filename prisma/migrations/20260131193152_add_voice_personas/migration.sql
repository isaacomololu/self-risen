-- AlterEnum: Migrate existing TtsVoicePreference values to new persona-based values

-- Step 1: Create new enum with all persona values
CREATE TYPE "TtsVoicePreference_new" AS ENUM ('MALE_CONFIDENT', 'MALE_FRIENDLY', 'FEMALE_EMPATHETIC', 'FEMALE_ENERGETIC', 'ANDROGYNOUS_CALM', 'ANDROGYNOUS_WISE');

-- Step 2: Convert column to text temporarily to allow data migration
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" DROP DEFAULT;

ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" TYPE text 
USING ("ttsVoicePreference"::text);

-- Step 3: Migrate existing user preferences to default personas
-- MALE -> MALE_CONFIDENT
-- FEMALE -> FEMALE_EMPATHETIC  
-- ANDROGYNOUS -> ANDROGYNOUS_CALM
UPDATE "User" 
SET "ttsVoicePreference" = CASE 
    WHEN "ttsVoicePreference" = 'MALE' THEN 'MALE_CONFIDENT'
    WHEN "ttsVoicePreference" = 'FEMALE' THEN 'FEMALE_EMPATHETIC'
    WHEN "ttsVoicePreference" = 'ANDROGYNOUS' THEN 'ANDROGYNOUS_CALM'
    ELSE "ttsVoicePreference"
END;

-- Step 4: Alter column to use new enum type
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" TYPE "TtsVoicePreference_new" 
USING ("ttsVoicePreference"::"TtsVoicePreference_new");

-- Step 5: Set default value
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" SET DEFAULT 'ANDROGYNOUS_CALM'::"TtsVoicePreference_new";

-- Step 6: Drop old enum and rename new one
DROP TYPE "TtsVoicePreference";
ALTER TYPE "TtsVoicePreference_new" RENAME TO "TtsVoicePreference";
