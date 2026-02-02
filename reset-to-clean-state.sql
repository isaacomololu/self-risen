-- Reset TtsVoicePreference to clean state before the failed migrations
-- This will reset to the simple MALE/FEMALE/ANDROGYNOUS enum
-- Then the pending migrations can apply cleanly

BEGIN;

-- Step 1: Clean up any orphaned enum types from failed migrations
DROP TYPE IF EXISTS "TtsVoicePreference_new" CASCADE;
DROP TYPE IF EXISTS "TtsVoicePreference_old" CASCADE;

-- Step 2: Convert User.ttsVoicePreference to text temporarily
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" DROP DEFAULT;

ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" TYPE text 
USING ("ttsVoicePreference"::text);

-- Step 3: Map any persona values back to simple values
UPDATE "User" 
SET "ttsVoicePreference" = CASE 
    WHEN "ttsVoicePreference" IN ('MALE_CONFIDENT', 'MALE_FRIENDLY') THEN 'MALE'
    WHEN "ttsVoicePreference" IN ('FEMALE_EMPATHETIC', 'FEMALE_ENERGETIC') THEN 'FEMALE'
    WHEN "ttsVoicePreference" IN ('ANDROGYNOUS_CALM', 'ANDROGYNOUS_WISE') THEN 'ANDROGYNOUS'
    ELSE "ttsVoicePreference"
END;

-- Step 4: Drop the existing TtsVoicePreference enum (if it exists)
DROP TYPE IF EXISTS "TtsVoicePreference" CASCADE;

-- Step 5: Create the simple enum (state before the failed migration)
CREATE TYPE "TtsVoicePreference" AS ENUM ('MALE', 'FEMALE', 'ANDROGYNOUS');

-- Step 6: Convert column back to enum type
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" TYPE "TtsVoicePreference" 
USING ("ttsVoicePreference"::"TtsVoicePreference");

-- Step 7: Set default
ALTER TABLE "User" 
ALTER COLUMN "ttsVoicePreference" SET DEFAULT 'ANDROGYNOUS'::"TtsVoicePreference";

COMMIT;

-- Verify the fix
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name = 'ttsVoicePreference';

SELECT 
    enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'TtsVoicePreference'
ORDER BY e.enumsortorder;
