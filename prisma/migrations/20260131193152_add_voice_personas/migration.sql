-- AlterEnum: Migrate existing TtsVoicePreference values to new persona-based values
-- Step 1: Create new enum with all persona values
CREATE TYPE "TtsVoicePreference_new" AS ENUM ('MALE_CONFIDENT', 'MALE_FRIENDLY', 'FEMALE_EMPATHETIC', 'FEMALE_ENERGETIC', 'ANDROGYNOUS_CALM', 'ANDROGYNOUS_WISE');

-- Step 2: Migrate existing user preferences to default personas
-- MALE -> MALE_CONFIDENT
-- FEMALE -> FEMALE_EMPATHETIC  
-- ANDROGYNOUS -> ANDROGYNOUS_CALM
UPDATE "User" 
SET "ttsVoicePreference" = CASE 
    WHEN "ttsVoicePreference"::text = 'MALE' THEN 'MALE_CONFIDENT'::text
    WHEN "ttsVoicePreference"::text = 'FEMALE' THEN 'FEMALE_EMPATHETIC'::text
    WHEN "ttsVoicePreference"::text = 'ANDROGYNOUS' THEN 'ANDROGYNOUS_CALM'::text
    ELSE "ttsVoicePreference"::text
END::text;

-- Step 3: Alter column to use new enum type
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" TYPE "TtsVoicePreference_new" 
USING ("ttsVoicePreference"::text::"TtsVoicePreference_new");

-- Step 4: Update default value
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" SET DEFAULT 'ANDROGYNOUS_CALM';

-- Step 5: Drop old enum and rename new one
DROP TYPE "TtsVoicePreference";
ALTER TYPE "TtsVoicePreference_new" RENAME TO "TtsVoicePreference";
